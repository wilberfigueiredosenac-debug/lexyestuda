import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch } from "./ai-gateway.server";

export type WordRow = Database["public"]["Tables"]["words"]["Row"];

function normalize(term: string) {
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function aiModel() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("A inteligência artificial não está configurada.");
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return lovable.responses("openai/gpt-6-astra");
}

const reasoningOptions = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

const analysisSchema = z.object({
  exists: z.boolean(),
  displayTerm: z.string(),
  wordClass: z.string(),
  meaning: z.string(),
  otherMeanings: z.array(z.string()),
  examples: z.array(z.string()),
  synonyms: z.array(z.string()),
  antonyms: z.array(z.string()),
  polysemy: z.string(),
  contextNote: z.string(),
  regionalNote: z.string(),
});

const SYSTEM_PROMPT = `Você é o LEXY, assistente de Língua Portuguesa para estudantes do Ensino Fundamental e Médio do Brasil.
Analise a palavra pedida e responda SEMPRE em português do Brasil, com linguagem simples e adequada a estudantes.
Regras:
- displayTerm: a palavra corrigida em letras minúsculas (corrija erros simples de digitação).
- wordClass: classe gramatical (ex.: substantivo, adjetivo, verbo).
- meaning: o significado principal, em uma ou duas frases curtas.
- otherMeanings: outros significados da palavra (lista vazia se não houver).
- examples: 2 a 3 frases completas usando a palavra.
- synonyms / antonyms: até 5 cada (lista vazia se não houver).
- polysemy: explique se a palavra tem mais de um sentido e quais são; se não tiver, explique que ela tem apenas um sentido.
- contextNote: explique como o contexto muda ou confirma o sentido da palavra.
- regionalNote: variação linguística ou regionalismo, se houver; caso contrário, string vazia.
- exists: false apenas quando a palavra não existir na Língua Portuguesa. Nesse caso preencha os outros campos com strings vazias e listas vazias.
Não escreva nada além das informações pedidas.`;

export const lookupWord = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ term: z.string().min(1).max(60) }).parse(input))
  .handler(async ({ data }) => {
    const term = normalize(data.term);
    const { supabaseAdmin: reader } = await import("@/integrations/supabase/client.server");
    const existing = await reader.from("words").select("*").eq("term", term).maybeSingle();
    if (existing.data) return { word: existing.data, notFound: false as const };

    let analysis: z.infer<typeof analysisSchema>;
    try {
      const result = streamText({
        model: aiModel(),
        system: SYSTEM_PROMPT,
        prompt: `Analise a palavra: "${term}"`,
        output: Output.object({ schema: analysisSchema }),
        providerOptions: reasoningOptions,
      });
      analysis = await result.output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("Não conseguimos analisar essa palavra agora. Tente novamente.");
      }
      console.error("[lexy] lookupWord", error);
      throw new Error("A pesquisa falhou. Tente novamente em instantes.");
    }

    if (!analysis.exists || !analysis.meaning) {
      return { word: null, notFound: true as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const insert = await supabaseAdmin
      .from("words")
      .upsert(
        {
          term,
          display_term: analysis.displayTerm || term,
          word_class: analysis.wordClass,
          meaning: analysis.meaning,
          other_meanings: analysis.otherMeanings,
          examples: analysis.examples,
          synonyms: analysis.synonyms,
          antonyms: analysis.antonyms,
          polysemy: analysis.polysemy,
          context_note: analysis.contextNote,
          regional_note: analysis.regionalNote,
        },
        { onConflict: "term" },
      )
      .select("*")
      .single();

    if (insert.error || !insert.data) {
      console.error("[lexy] save word", insert.error);
      throw new Error("Não foi possível guardar a análise da palavra.");
    }

    return { word: insert.data, notFound: false as const };
  });

export const recordSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ term: z.string().min(1).max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("search_history")
      .insert({ user_id: context.userId, term: normalize(data.term) });
    return { ok: true };
  });

const quizSchema = z.object({
  questions: z.array(
    z.object({
      term: z.string(),
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
    }),
  ),
});

export const generateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const saved = await context.supabase
      .from("vocabulary")
      .select("word_id, words(display_term, meaning, word_class)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const items = (saved.data ?? [])
      .map((row) => ({
        wordId: row.word_id,
        term: row.words?.display_term ?? "",
        meaning: row.words?.meaning ?? "",
      }))
      .filter((item) => item.term);

    if (items.length === 0) return { questions: [] as Array<z.infer<typeof quizSchema>["questions"][number] & { wordId: string | null }> };

    const pool = items.sort(() => Math.random() - 0.5).slice(0, 5);

    try {
      const result = streamText({
        model: aiModel(),
        system:
          "Você é o LEXY, professor de Língua Portuguesa. Crie perguntas de múltipla escolha, em português do Brasil, com linguagem simples para estudantes. Cada pergunta tem exatamente 4 alternativas, apenas uma correta, e correctIndex é o índice (0 a 3) da alternativa correta. explanation é uma frase curta explicando a resposta certa.",
        prompt: `Crie uma pergunta para cada palavra abaixo, na mesma ordem:\n${pool
          .map((item) => `- ${item.term}: ${item.meaning}`)
          .join("\n")}`,
        output: Output.object({ schema: quizSchema }),
        providerOptions: reasoningOptions,
      });
      const quiz = await result.output;
      return {
        questions: quiz.questions.slice(0, pool.length).map((question, index) => ({
          ...question,
          term: question.term || pool[index]?.term || "",
          wordId: pool[index]?.wordId ?? null,
        })),
      };
    } catch (error) {
      console.error("[lexy] generateReview", error);
      throw new Error("Não foi possível criar a revisão agora. Tente novamente.");
    }
  });

const customQuizSchema = z.object({
  questions: z.array(
    z.object({
      term: z.string(),
      type: z.string(),
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
    }),
  ),
  sentences: z.array(
    z.object({
      term: z.string(),
      prompt: z.string(),
      sampleAnswer: z.string(),
    }),
  ),
});

const sentenceCheckSchema = z.object({
  correct: z.boolean(),
  feedback: z.string(),
  improved: z.string(),
});

export const checkSentence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        term: z.string().trim().min(1).max(80),
        prompt: z.string().trim().min(1).max(500),
        answer: z.string().trim().min(1).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const result = streamText({
        model: aiModel(),
        system: `Você é o LEXY, professor de Língua Portuguesa, gentil e encorajador. Corrija a frase escrita por um estudante em português do Brasil.
correct = true SOMENTE quando a frase usa a palavra-alvo com o sentido pedido E o contexto da frase deixa esse sentido claro (quem lê entende o que a palavra significa). Pequenos deslizes de digitação não reprovam.
correct = false quando a palavra só aparece solta, sem que a frase mostre o significado (ex.: "Eu gosto de saudade."), quando o sentido está errado ou quando não atende ao pedido.
feedback: 1 ou 2 frases curtas e simples explicando o acerto ou exatamente o que falta para mostrar o sentido.
improved: uma versão corrigida/melhorada da frase do aluno que deixe o sentido claro.`,
        prompt: `Palavra-alvo: ${data.term}\nPedido: ${data.prompt}\nFrase do aluno: """${data.answer}"""`,
        output: Output.object({ schema: sentenceCheckSchema }),
        providerOptions: reasoningOptions,
      });
      return await result.output;
    } catch (error) {
      console.error("[lexy] checkSentence", error);
      throw new Error("Não foi possível corrigir a frase agora. Tente novamente.");
    }
  });

function shuffleOptions<T extends { options: string[]; correctIndex: number }>(q: T): T {
  const right = q.options[q.correctIndex]!;
  const opts = [...q.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j]!, opts[i]!];
  }
  return { ...q, options: opts, correctIndex: opts.indexOf(right) };
}

export const generateCustomExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        source: z.string().trim().min(1).max(3000),
        level: z.enum(["fundamental", "medio"]),
        count: z.number().int().min(3).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const result = streamText({
        model: aiModel(),
        system: `Você é o LEXY, professor de Língua Portuguesa. Crie exercícios de vocabulário personalizados, em português do Brasil, adequados a estudantes do Ensino ${
          data.level === "medio" ? "Médio" : "Fundamental"
        }.
O aluno pode enviar uma palavra, um texto ou um tema:
- Palavra: explore a palavra por vários ângulos (significado, sinônimos, antônimos, polissemia, uso) e palavras da mesma família.
- Texto: escolha as palavras mais importantes ou difíceis do texto e pergunte o sentido delas NAQUELE contexto.
- Tema: escolha vocabulário variado e relevante do tema (substantivos, adjetivos e verbos), uma palavra diferente por pergunta sempre que possível.

PERGUNTAS DE MÚLTIPLA ESCOLHA
Use estes tipos (campo type) e VARIE: nunca repita o mesmo tipo em duas perguntas seguidas e use pelo menos 4 tipos diferentes quando houver 5 ou mais perguntas:
- "significado": o que a palavra quer dizer.
- "sinônimo": qual palavra tem sentido parecido.
- "antônimo": qual palavra tem sentido oposto.
- "contexto": uma frase com a palavra; qual o sentido dela ali.
- "completar frase": frase com lacuna (___); qual palavra completa com sentido.
- "polissemia": em qual frase a palavra tem um sentido diferente dos outros.
- "uso correto": qual das 4 frases usa a palavra corretamente.
- "intruso": qual palavra não pertence ao mesmo campo de sentido.
Regras das alternativas: exatamente 4, todas diferentes, da mesma classe gramatical e de tamanho parecido; as erradas devem ser plausíveis (confusões comuns de estudantes), nunca absurdas ou engraçadas; não use "todas as anteriores" nem "nenhuma das anteriores". Não repita a mesma pergunta. correctIndex é o índice (0 a 3) da correta; term é a palavra trabalhada; explanation é uma frase curta explicando por que a resposta está certa.

FRASES PARA ESCREVER (sentences)
Crie de 2 a 3 desafios em que o aluno escreve uma frase própria que PROVE que entendeu o significado de term. O prompt deve dar uma situação concreta e exigir que o sentido fique claro pelo contexto, por exemplo: "Escreva uma frase sobre um fim de semana em que fique claro que 'efêmero' significa algo que dura pouco." Evite pedidos vagos como "Escreva uma frase com a palavra X". sampleAnswer é um exemplo de boa resposta em que o sentido fica evidente.

words: lista com as palavras trabalhadas (em minúsculas, sem repetição).`,
        prompt: `Crie exatamente ${data.count} exercícios de múltipla escolha e de 2 a 3 frases para responder a partir de:\n"""\n${data.source}\n"""`,
        output: Output.object({ schema: customQuizSchema.extend({ words: z.array(z.string()) }) }),
        providerOptions: reasoningOptions,
      });
      const quiz = await result.output;
      const seen = new Set<string>();
      const questions = quiz.questions
        .filter((q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length)
        .filter((q) => {
          const key = q.question.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(shuffleOptions)
        .slice(0, data.count);
      const sentences = quiz.sentences.filter((s) => s.prompt.trim()).slice(0, 3);
      if (questions.length === 0) throw new Error("empty");
      const words = Array.from(
        new Set(
          [...quiz.words, ...questions.map((q) => q.term), ...sentences.map((s) => s.term)]
            .map((w) => w.trim().toLowerCase())
            .filter((w) => w && w.length <= 40),
        ),
      );
      return { questions, sentences, words };
    } catch (error) {
      console.error("[lexy] generateCustomExercises", error);
      throw new Error("Não foi possível criar os exercícios agora. Tente novamente.");
    }
  });

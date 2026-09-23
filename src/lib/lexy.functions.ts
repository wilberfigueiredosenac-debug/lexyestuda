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
    const supabase = publicClient();

    const existing = await supabase.from("words").select("*").eq("term", term).maybeSingle();
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
});

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
- Palavra: explore significado, sinônimos, antônimos, polissemia e uso em frases.
- Texto: escolha palavras importantes do texto e pergunte o sentido delas no contexto.
- Tema: selecione vocabulário relevante sobre o tema.
Varie os tipos (type): "significado", "sinônimo", "antônimo", "contexto", "completar frase", "polissemia".
Cada pergunta tem exatamente 4 alternativas diferentes, apenas uma correta; correctIndex é o índice (0 a 3) da correta; term é a palavra trabalhada; explanation é uma frase curta explicando a resposta.`,
        prompt: `Crie exatamente ${data.count} exercícios a partir de:\n"""\n${data.source}\n"""`,
        output: Output.object({ schema: customQuizSchema }),
        providerOptions: reasoningOptions,
      });
      const quiz = await result.output;
      const questions = quiz.questions
        .filter((q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length)
        .slice(0, data.count);
      if (questions.length === 0) throw new Error("empty");
      return { questions };
    } catch (error) {
      console.error("[lexy] generateCustomExercises", error);
      throw new Error("Não foi possível criar os exercícios agora. Tente novamente.");
    }
  });

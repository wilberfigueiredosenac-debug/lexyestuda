import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { generateCustomExercises } from "@/lib/lexy.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logStudy } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/exercicios")({
  head: () => ({
    meta: [
      { title: "Exercícios personalizados | LEXY" },
      {
        name: "description",
        content: "Envie uma palavra, um texto ou um tema e receba exercícios de vocabulário feitos para você.",
      },
      { property: "og:title", content: "Exercícios personalizados | LEXY" },
      {
        property: "og:description",
        content: "Exercícios de vocabulário criados com IA a partir de palavras, textos ou temas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExercisesPage,
});

type Question = {
  term: string;
  type: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const MODES = [
  { id: "palavra", label: "Palavra", placeholder: "Ex.: saudade" },
  { id: "texto", label: "Texto", placeholder: "Cole aqui um trecho de texto..." },
  { id: "tema", label: "Tema", placeholder: "Ex.: meio ambiente, futebol, tecnologia" },
] as const;

function ExercisesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const run = useServerFn(generateCustomExercises);
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("palavra");
  const [source, setSource] = useState("");
  const [level, setLevel] = useState<"fundamental" | "medio">("fundamental");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const start = useMutation({
    mutationFn: async () => {
      const prefix = mode === "palavra" ? "Palavra" : mode === "texto" ? "Texto" : "Tema";
      return (await run({ data: { source: `${prefix}: ${source.trim()}`, level, count } })) as {
        questions: Question[];
      };
    },
    onSuccess: (data) => {
      setQuestions(data.questions);
      setIndex(0);
      setChosen(null);
      setScore(0);
      setDone(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível criar os exercícios."),
  });

  const current = questions[index];
  const activeMode = MODES.find((m) => m.id === mode)!;

  async function answer(option: number) {
    if (chosen !== null || !current || !user) return;
    setChosen(option);
    const correct = option === current.correctIndex;
    if (correct) setScore((v) => v + 1);
    await supabase.from("reviews").insert({
      user_id: user.id,
      word_id: null,
      term: current.term,
      question: current.question,
      answer: current.options[option] ?? "",
      correct,
    });
    await logStudy();
    void queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
  }

  function next() {
    if (index + 1 >= questions.length) return setDone(true);
    setIndex(index + 1);
    setChosen(null);
  }

  function reset() {
    setQuestions([]);
    setDone(false);
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <h1 className="font-display text-4xl font-black uppercase">Exercícios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie uma palavra, um texto ou um tema e o LEXY cria exercícios só para você.
        </p>
      </header>

      {questions.length === 0 && !start.isPending && (
        <form
          className="paper-card flex flex-col gap-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!source.trim()) return toast.info("Escreva algo para gerar os exercícios.");
            start.mutate();
          }}
        >
          <div className="flex gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex-1 rounded-xl border-2 py-2 font-bold ${
                  mode === m.id ? "border-accent bg-accent/15" : "border-border bg-card"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === "texto" ? (
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              rows={6}
              maxLength={2900}
              placeholder={activeMode.placeholder}
              className="rounded-xl border-2 border-border bg-card p-3 text-base"
            />
          ) : (
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={120}
              placeholder={activeMode.placeholder}
              className="h-12 rounded-xl border-2 border-border bg-card px-3 text-base"
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-bold">
              Nível
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as "fundamental" | "medio")}
                className="h-11 rounded-xl border-2 border-border bg-card px-3"
              >
                <option value="fundamental">Ensino Fundamental</option>
                <option value="medio">Ensino Médio</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold">
              Quantidade
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="h-11 rounded-xl border-2 border-border bg-card px-3"
              >
                {[3, 5, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} exercícios
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-accent py-4 text-lg font-black text-accent-foreground"
          >
            <Wand2 className="h-5 w-5" aria-hidden /> Gerar exercícios
          </button>
        </form>
      )}

      {start.isPending && (
        <div className="paper-card flex items-center gap-3 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
          <p className="font-bold">Criando seus exercícios...</p>
        </div>
      )}

      {current && !done && (
        <div className="paper-card flex flex-col gap-4 p-6">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            Exercício {index + 1} de {questions.length} — {current.type} · {current.term}
          </p>
          <p className="text-lg font-bold">{current.question}</p>
          <div className="flex flex-col gap-2">
            {current.options.map((option, i) => {
              const revealed = chosen !== null;
              return (
                <button
                  key={`${i}-${option}`}
                  onClick={() => answer(i)}
                  disabled={revealed}
                  className={`rounded-xl border-2 px-4 py-3 text-left font-bold transition ${
                    revealed && i === current.correctIndex
                      ? "border-accent bg-accent/15"
                      : revealed && i === chosen
                        ? "border-destructive bg-destructive/10"
                        : "border-border bg-card"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {chosen !== null && (
            <>
              <p className="text-sm text-muted-foreground">{current.explanation}</p>
              <button onClick={next} className="h-12 rounded-xl bg-primary font-black text-primary-foreground">
                {index + 1 >= questions.length ? "Ver resultado" : "Próximo exercício"}
              </button>
            </>
          )}
        </div>
      )}

      {done && (
        <div className="paper-card flex flex-col gap-4 p-6 text-center">
          <p className="font-display text-3xl font-black">
            {score} de {questions.length} certas
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => start.mutate()} className="h-12 rounded-xl bg-accent font-black text-accent-foreground">
              Gerar novos
            </button>
            <button onClick={reset} className="h-12 rounded-xl border-2 border-border bg-card font-black">
              Mudar tema
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

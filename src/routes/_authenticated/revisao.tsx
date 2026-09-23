import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateReview } from "@/lib/lexy.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/revisao")({
  head: () => ({
    meta: [
      { title: "Revisão de palavras | LEXY" },
      {
        name: "description",
        content: "Responda perguntas criadas a partir das palavras que você salvou no LEXY.",
      },
      { property: "og:title", content: "Revisão de palavras | LEXY" },
      {
        property: "og:description",
        content: "Perguntas personalizadas feitas com as suas palavras salvas.",
      },
    ],
  }),
  component: ReviewPage,
});

type Question = {
  term: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  wordId: string | null;
};

function ReviewPage() {
  const { user } = useAuth();
  const run = useServerFn(generateReview);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const start = useMutation({
    mutationFn: async () => (await run({ data: undefined })) as { questions: Question[] },
    onSuccess: (data) => {
      if (data.questions.length === 0) {
        toast.info("Salve algumas palavras antes de revisar.");
        return;
      }
      setQuestions(data.questions);
      setIndex(0);
      setChosen(null);
      setScore(0);
      setDone(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a revisão."),
  });

  const current = questions[index];

  async function answer(option: number) {
    if (chosen !== null || !current || !user) return;
    setChosen(option);
    const correct = option === current.correctIndex;
    if (correct) setScore((value) => value + 1);
    await supabase.from("reviews").insert({
      user_id: user.id,
      word_id: current.wordId,
      term: current.term,
      question: current.question,
      answer: current.options[option] ?? "",
      correct,
    });
  }

  function next() {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex(index + 1);
    setChosen(null);
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <h1 className="font-display text-4xl font-black uppercase">Revisão</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perguntas criadas a partir das palavras do seu vocabulário.
        </p>
      </header>

      {questions.length === 0 && !start.isPending && (
        <div className="paper-card flex flex-col gap-4 p-6">
          <p>
            Vamos revisar? O LEXY cria perguntas com as palavras que você salvou. Se o seu caderno
            estiver vazio, <Link to="/vocabulario" className="font-bold underline">salve palavras primeiro</Link>.
          </p>
          <button
            onClick={() => start.mutate()}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent py-4 text-lg font-black text-accent-foreground"
          >
            <Sparkles className="h-5 w-5" aria-hidden /> Começar revisão
          </button>
        </div>
      )}

      {start.isPending && (
        <div className="paper-card flex items-center gap-3 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
          <p className="font-bold">Preparando suas perguntas...</p>
        </div>
      )}

      {current && !done && (
        <div className="paper-card flex flex-col gap-4 p-6">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            Pergunta {index + 1} de {questions.length} — {current.term}
          </p>
          <p className="text-lg font-bold">{current.question}</p>
          <div className="flex flex-col gap-2">
            {current.options.map((option, optionIndex) => {
              const isCorrect = optionIndex === current.correctIndex;
              const revealed = chosen !== null;
              return (
                <button
                  key={option}
                  onClick={() => answer(optionIndex)}
                  disabled={revealed}
                  className={`rounded-xl border-2 px-4 py-3 text-left font-bold transition ${
                    revealed && isCorrect
                      ? "border-accent bg-accent/15"
                      : revealed && optionIndex === chosen
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
              <button
                onClick={next}
                className="h-12 rounded-xl bg-primary font-black text-primary-foreground"
              >
                {index + 1 >= questions.length ? "Ver resultado" : "Próxima pergunta"}
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
          <p className="text-sm text-muted-foreground">
            Cada revisão ajuda a fixar as palavras do seu vocabulário.
          </p>
          <button
            onClick={() => start.mutate()}
            className="h-12 rounded-xl bg-accent font-black text-accent-foreground"
          >
            Revisar de novo
          </button>
        </div>
      )}
    </div>
  );
}

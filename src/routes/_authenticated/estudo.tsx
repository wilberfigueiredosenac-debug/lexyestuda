import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Flame, Loader2, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { computeStreak, logStudy, todayKey } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/estudo")({
  head: () => ({
    meta: [
      { title: "Estudo diário | LEXY" },
      { name: "description", content: "Revise as palavras do seu vocabulário todos os dias e mantenha sua sequência." },
      { property: "og:title", content: "Estudo diário | LEXY" },
      { property: "og:description", content: "Revise suas palavras todos os dias e mantenha sua sequência." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyStudyPage,
});

type Item = { wordId: string; term: string; meaning: string };
type Card = Item & { options: string[]; correctIndex: number };

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const FALLBACK = [
  "Sentimento de grande alegria.",
  "Ação de caminhar devagar.",
  "Objeto usado para cortar.",
  "Lugar onde se guardam livros.",
];

function buildCards(items: Item[]): Card[] {
  return shuffle(items).map((item) => {
    const others = shuffle(items.filter((o) => o.wordId !== item.wordId).map((o) => o.meaning));
    const distractors = [...others, ...shuffle(FALLBACK)].filter((m) => m !== item.meaning).slice(0, 3);
    const options = shuffle([item.meaning, ...distractors]);
    return { ...item, options, correctIndex: options.indexOf(item.meaning) };
  });
}

function DailyStudyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const words = useQuery({
    queryKey: ["daily-study-words", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("word_id, words(term, display_term, meaning)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return buildCards(
        (data ?? [])
          .filter((r) => r.words)
          .map((r) => ({ wordId: r.word_id, term: r.words!.display_term || r.words!.term, meaning: r.words!.meaning })),
      );
    },
    staleTime: Infinity,
  });

  const progress = useQuery({
    queryKey: ["daily-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [goal, activity] = await Promise.all([
        supabase.from("study_goals").select("daily_target").maybeSingle(),
        supabase.from("study_activity").select("day, count").order("day", { ascending: false }).limit(400),
      ]);
      const target = goal.data?.daily_target ?? 5;
      const rows = activity.data ?? [];
      const today = rows.find((r) => r.day === todayKey())?.count ?? 0;
      return { target, today, streak: computeStreak(rows, target) };
    },
  });

  const cards = words.data ?? [];
  const answered = Object.keys(answers).length;
  const right = useMemo(
    () => cards.filter((c) => answers[c.wordId] === c.correctIndex).length,
    [cards, answers],
  );

  async function answer(card: Card, option: number) {
    if (answers[card.wordId] !== undefined || !user) return;
    setAnswers((a) => ({ ...a, [card.wordId]: option }));
    const correct = option === card.correctIndex;
    await supabase.from("reviews").insert({
      user_id: user.id,
      word_id: card.wordId,
      term: card.term,
      question: `O que significa "${card.term}"?`,
      answer: card.options[option] ?? "",
      correct,
    });
    await logStudy();
    void queryClient.invalidateQueries({ queryKey: ["daily-progress"] });
    void queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
  }

  const p = progress.data;
  const pct = p ? Math.min(100, Math.round((p.today / p.target) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <h1 className="font-display text-4xl font-black uppercase">Estudo diário</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Responda sobre as palavras do seu vocabulário. Cada resposta conta para a meta do dia.
        </p>
      </header>

      <section className="paper-card grid gap-4 p-5 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <Flame className="h-8 w-8 text-accent" aria-hidden />
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground">Sequência</p>
            <p data-testid="streak" className="font-display text-2xl font-black">
              {p ? `${p.streak} ${p.streak === 1 ? "dia" : "dias"}` : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-accent" aria-hidden />
          <div className="flex-1">
            <p className="text-xs font-black uppercase text-muted-foreground">Meta de hoje</p>
            <p data-testid="goal" className="font-bold">
              {p ? `${p.today} de ${p.target}` : "—"} {p && p.today >= p.target && "· cumprida!"}
            </p>
            <div className="mt-1 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      {words.isLoading && (
        <div className="paper-card flex items-center gap-3 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden /> Carregando suas palavras...
        </div>
      )}

      {!words.isLoading && cards.length === 0 && (
        <div className="paper-card p-6 text-center">
          <p className="font-bold">Seu vocabulário ainda está vazio.</p>
          <Link to="/" className="mt-3 inline-block rounded-xl bg-accent px-5 py-3 font-black text-accent-foreground">
            Pesquisar uma palavra
          </Link>
        </div>
      )}

      {cards.map((card, n) => {
        const chosen = answers[card.wordId];
        const revealed = chosen !== undefined;
        return (
          <article key={card.wordId} className="paper-card flex flex-col gap-3 p-5">
            <p className="text-xs font-black uppercase text-muted-foreground">
              Palavra {n + 1} de {cards.length}
            </p>
            <p className="text-lg font-bold">
              O que significa <span className="font-display text-2xl">“{card.term}”</span>?
            </p>
            <div className="flex flex-col gap-2">
              {card.options.map((option, i) => (
                <button
                  key={`${i}-${option}`}
                  disabled={revealed}
                  onClick={() => answer(card, i)}
                  className={`rounded-xl border-2 px-4 py-3 text-left font-bold ${
                    revealed && i === card.correctIndex
                      ? "border-accent bg-accent/15"
                      : revealed && i === chosen
                        ? "border-destructive bg-destructive/10"
                        : "border-border bg-card"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </article>
        );
      })}

      {cards.length > 0 && answered === cards.length && (
        <div className="paper-card p-6 text-center">
          <p className="font-display text-3xl font-black">
            {right} de {cards.length} certas
          </p>
          <button
            onClick={() => {
              setAnswers({});
              void words.refetch();
            }}
            className="mt-4 h-12 rounded-xl bg-accent px-6 font-black text-accent-foreground"
          >
            Estudar de novo
          </button>
        </div>
      )}
    </div>
  );
}

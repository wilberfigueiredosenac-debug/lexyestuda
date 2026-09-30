import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Flame, Loader2, Target, Timer } from "lucide-react";
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

function fmt(ms: number) {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}min ${sec % 60}s`;
}

function DailyStudyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, { option: number; ms: number }>>({});
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(0);
  const startedAt = useRef(0);

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
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const [goal, activity, times] = await Promise.all([
        supabase.from("study_goals").select("daily_target").maybeSingle(),
        supabase.from("study_activity").select("day, count").order("day", { ascending: false }).limit(400),
        supabase
          .from("reviews")
          .select("duration_ms")
          .eq("source", "estudo")
          .gte("created_at", start.toISOString())
          .not("duration_ms", "is", null),
      ]);
      const target = goal.data?.daily_target ?? 5;
      const rows = activity.data ?? [];
      const today = rows.find((r) => r.day === todayKey())?.count ?? 0;
      const durations = (times.data ?? []).map((t) => t.duration_ms ?? 0);
      const totalMs = durations.reduce((a, b) => a + b, 0);
      return {
        target,
        today,
        streak: computeStreak(rows, target),
        totalMs,
        avgMs: durations.length ? totalMs / durations.length : 0,
        timed: durations.length,
      };
    },
  });

  const cards = words.data ?? [];
  const current = cards[index];
  const finished = cards.length > 0 && index >= cards.length;
  const right = useMemo(
    () => cards.filter((c) => answers[c.wordId]?.option === c.correctIndex).length,
    [cards, answers],
  );
  const sessionMs = Object.values(answers).reduce((a, b) => a + b.ms, 0);

  // start timer when a new card appears
  useEffect(() => {
    if (!current) return;
    startedAt.current = performance.now();
    setNow(0);
    const t = setInterval(() => setNow(performance.now() - startedAt.current), 250);
    return () => clearInterval(t);
  }, [current?.wordId]);

  async function answer(card: Card, option: number) {
    if (answers[card.wordId] !== undefined || !user) return;
    const ms = Math.round(performance.now() - startedAt.current);
    setAnswers((a) => ({ ...a, [card.wordId]: { option, ms } }));
    const correct = option === card.correctIndex;
    const before = progress.data;
    await supabase.from("reviews").insert({
      user_id: user.id,
      word_id: card.wordId,
      term: card.term,
      question: `O que significa "${card.term}"?`,
      answer: card.options[option] ?? "",
      correct,
      duration_ms: ms,
      source: "estudo",
    });
    await logStudy();
    if (before && before.today < before.target && before.today + 1 >= before.target) {
      toast.success("Meta de hoje cumprida! Sua sequência foi atualizada. 🔥");
    }
    void queryClient.invalidateQueries({ queryKey: ["daily-progress"] });
    void queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["study-today"] });
    setTimeout(() => setIndex((i) => i + 1), correct ? 900 : 1800);
  }

  const p = progress.data;
  const pct = p ? Math.min(100, Math.round((p.today / p.target) * 100)) : 0;
  const remaining = p ? Math.max(0, p.target - p.today) : 0;
  const chosen = current ? answers[current.wordId] : undefined;

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <h1 className="font-display text-4xl font-black uppercase">Estudo diário</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Responda sobre as palavras do seu vocabulário. Cada resposta conta para a meta do dia.
        </p>
      </header>

      <section className="paper-card grid gap-4 p-5 sm:grid-cols-3">
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
              {p ? `${p.today} de ${p.target}` : "—"}
            </p>
            <div className="mt-1 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {p ? (remaining === 0 ? "Meta de hoje cumprida!" : `Faltam ${remaining} para a meta`) : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Timer className="h-8 w-8 text-accent" aria-hidden />
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground">Tempo hoje</p>
            <p data-testid="time-today" className="font-display text-2xl font-black">
              {p ? fmt(p.totalMs) : "—"}
            </p>
            <p className="text-xs font-bold text-muted-foreground">
              {p && p.timed > 0 ? `Média ${fmt(p.avgMs)} por palavra` : "Sem respostas hoje"}
            </p>
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

      {current && (
        <article key={current.wordId} className="paper-card flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between text-xs font-black uppercase text-muted-foreground">
            <span>
              Palavra {index + 1} de {cards.length}
            </span>
            <span data-testid="word-timer" className="flex items-center gap-1">
              <Timer className="h-4 w-4" aria-hidden /> {fmt(chosen ? chosen.ms : now)}
            </span>
          </div>
          <p className="text-lg font-bold">
            O que significa <span className="font-display text-2xl">“{current.term}”</span>?
          </p>
          <div className="flex flex-col gap-2">
            {current.options.map((option, i) => (
              <button
                key={`${i}-${option}`}
                disabled={!!chosen}
                onClick={() => answer(current, i)}
                className={`rounded-xl border-2 px-4 py-3 text-left font-bold ${
                  chosen && i === current.correctIndex
                    ? "border-accent bg-accent/15"
                    : chosen && i === chosen.option
                      ? "border-destructive bg-destructive/10"
                      : "border-border bg-card"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {chosen && (
            <p className="text-sm font-bold text-muted-foreground">
              {chosen.option === current.correctIndex ? "Certo!" : "Não foi dessa vez."} Indo para a próxima...
            </p>
          )}
        </article>
      )}

      {finished && (
        <div className="paper-card flex flex-col gap-3 p-6 text-center">
          <p className="font-display text-3xl font-black">
            {right} de {cards.length} certas
          </p>
          <p className="font-bold">
            Tempo desta rodada: {fmt(sessionMs)} · média {fmt(sessionMs / Math.max(1, cards.length))} por palavra
          </p>
          <div className="flex flex-col gap-1 text-left text-sm">
            {cards.map((c) => (
              <div key={c.wordId} className="flex justify-between border-b border-border py-1">
                <span className="font-bold">
                  {answers[c.wordId]?.option === c.correctIndex ? "✓" : "✗"} {c.term}
                </span>
                <span className="text-muted-foreground">{fmt(answers[c.wordId]?.ms ?? 0)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setAnswers({});
              setIndex(0);
              void words.refetch();
            }}
            className="mt-2 h-12 rounded-xl bg-accent px-6 font-black text-accent-foreground"
          >
            Estudar de novo
          </button>
        </div>
      )}
    </div>
  );
}

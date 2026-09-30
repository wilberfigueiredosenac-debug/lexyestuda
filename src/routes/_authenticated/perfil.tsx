import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BarChart3, Flame, Lock, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { displayName, useAuth } from "@/lib/auth";
import { bestStreak, computeAchievements, computeStreak, todayKey } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | LEXY" },
      {
        name: "description",
        content: "Veja seu progresso no LEXY: metas diárias, sequência de dias, conquistas e revisões.",
      },
      { property: "og:title", content: "Meu perfil | LEXY" },
      { property: "og:description", content: "Seu progresso de vocabulário no LEXY." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const stats = useQuery({
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 400);
      const week = new Date();
      week.setDate(week.getDate() - 6);
      week.setHours(0, 0, 0, 0);
      const [saved, favorites, reviews, correct, plays, goal, activity, recent] = await Promise.all([
        supabase.from("vocabulary").select("id", { count: "exact", head: true }),
        supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("favorite", true),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("correct", true),
        supabase.from("pronunciation_plays").select("id", { count: "exact", head: true }),
        supabase.from("study_goals").select("*").maybeSingle(),
        supabase.from("study_activity").select("day, count").gte("day", todayKey(since)),
        supabase
          .from("reviews")
          .select("created_at, correct, duration_ms, source, word_id, term")
          .gte("created_at", week.toISOString())
          .limit(2000),
      ]);
      return {
        saved: saved.count ?? 0,
        favorites: favorites.count ?? 0,
        reviews: reviews.count ?? 0,
        correct: correct.count ?? 0,
        plays: plays.count ?? 0,
        goal: goal.data,
        activity: activity.data ?? [],
        recent: recent.data ?? [],
      };
    },
  });

  const [target, setTarget] = useState(5);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState("18:00");

  useEffect(() => {
    const g = stats.data?.goal;
    if (!g) return;
    setTarget(g.daily_target);
    setReminderOn(g.reminder_enabled);
    setReminderTime(g.reminder_time.slice(0, 5));
  }, [stats.data?.goal]);

  const saveGoal = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (reminderOn && typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      const { error } = await supabase.from("study_goals").upsert({
        user_id: user.id,
        daily_target: target,
        reminder_enabled: reminderOn,
        reminder_time: reminderTime,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta salva!");
      void queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["study-today"] });
    },
    onError: () => toast.error("Não foi possível salvar a meta."),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const s = stats.data;
  const goalTarget = s?.goal?.daily_target ?? 5;
  const activity = s?.activity ?? [];
  const todayCount = activity.find((a) => a.day === todayKey())?.count ?? 0;
  const streak = computeStreak(activity, goalTarget);
  const best = bestStreak(activity, goalTarget);
  const achievements = computeAchievements({
    saved: s?.saved ?? 0,
    favorites: s?.favorites ?? 0,
    reviews: s?.reviews ?? 0,
    correct: s?.correct ?? 0,
    plays: s?.plays ?? 0,
    streak,
    best,
  });
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const progress = Math.min(100, Math.round((todayCount / goalTarget) * 100));

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = todayKey(d);
    const count = activity.find((a) => a.day === key)?.count ?? 0;
    return { key, label: d.toLocaleDateString("pt-BR", { weekday: "narrow" }), hit: count >= goalTarget, some: count > 0 };
  });

  const recent = s?.recent ?? [];
  const remaining = Math.max(0, goalTarget - todayCount);
  const statDays = week.map((d) => {
    const rows = recent.filter((r) => todayKey(new Date(r.created_at)) === d.key);
    const right = rows.filter((r) => r.correct).length;
    const studyMs = rows
      .filter((r) => r.source === "estudo")
      .reduce((a, r) => a + (r.duration_ms ?? 0), 0);
    return { ...d, right, wrong: rows.length - right, studyMs };
  });
  const maxAnswers = Math.max(1, ...statDays.map((d) => d.right + d.wrong));
  const maxMs = Math.max(1, ...statDays.map((d) => d.studyMs));
  const reviewedWeek = new Set(recent.map((r) => r.word_id ?? r.term)).size;
  const timedRows = recent.filter((r) => r.source === "estudo" && r.duration_ms != null);
  const weekMs = timedRows.reduce((a, r) => a + (r.duration_ms ?? 0), 0);
  const avgMs = timedRows.length ? weekMs / timedRows.length : 0;
  const fmtMs = (ms: number) => {
    const sec = Math.round(ms / 1000);
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}min${sec % 60 ? ` ${sec % 60}s` : ""}`;
  };

  const cards = [
    { label: "Palavras salvas", value: s?.saved ?? 0 },
    { label: "Favoritas", value: s?.favorites ?? 0 },
    { label: "Perguntas respondidas", value: s?.reviews ?? 0 },
    { label: "Acertos", value: s?.correct ?? 0 },
    { label: "Pronúncias ouvidas", value: s?.plays ?? 0 },
    { label: "Melhor sequência", value: best },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <h1 className="font-display text-4xl font-black uppercase">Perfil</h1>
        <p className="mt-1 text-lg font-bold">{displayName(user)}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <section className="paper-card flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="h-8 w-8 text-secondary" aria-hidden />
            <div>
              <p className="font-display text-3xl font-black">
                {streak} {streak === 1 ? "dia" : "dias"}
              </p>
              <p className="text-xs font-bold uppercase text-muted-foreground">Sequência atual</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-black">
              {todayCount}/{goalTarget}
            </p>
            <p className="text-xs font-bold uppercase text-muted-foreground">Meta de hoje</p>
          </div>
        </div>
        <p data-testid="goal-remaining" className="font-bold">
          {remaining === 0
            ? "Meta de hoje cumprida! 🎉"
            : `Faltam ${remaining} ${remaining === 1 ? "atividade" : "atividades"} para a meta de hoje.`}
        </p>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between">
          {week.map((d) => (
            <div key={d.key} className="flex flex-col items-center gap-1">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-black ${
                  d.hit ? "border-accent bg-accent text-accent-foreground" : d.some ? "border-accent" : "border-border"
                }`}
              >
                {d.hit ? "✓" : ""}
              </span>
              <span className="text-xs font-bold uppercase text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Contam como atividade: salvar palavras, ouvir pronúncias e responder revisões ou exercícios.
        </p>
      </section>

      <section className="paper-card flex flex-col gap-4 p-5">
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <Target className="h-5 w-5 text-accent" aria-hidden /> Meta diária e lembrete
        </h2>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Atividades por dia
          <input
            type="number"
            min={1}
            max={100}
            value={target}
            onChange={(e) => setTarget(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="h-11 rounded-xl border-2 border-border bg-card px-3"
          />
        </label>
        <label className="flex items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={reminderOn}
            onChange={(e) => setReminderOn(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-accent)]"
          />
          Me lembrar de estudar
        </label>
        {reminderOn && (
          <label className="flex flex-col gap-1 text-sm font-bold">
            Horário do lembrete
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="h-11 rounded-xl border-2 border-border bg-card px-3"
            />
          </label>
        )}
        <button
          onClick={() => saveGoal.mutate()}
          disabled={saveGoal.isPending}
          className="h-12 rounded-xl bg-primary font-black text-primary-foreground disabled:opacity-60"
        >
          Salvar meta
        </button>
      </section>

      <section className="paper-card flex flex-col gap-5 p-5">
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <BarChart3 className="h-5 w-5 text-accent" aria-hidden /> Estatísticas
        </h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-display text-3xl font-black text-accent">{s?.reviews ?? 0}</p>
            <p className="text-xs font-bold uppercase text-muted-foreground">Palavras revisadas</p>
          </div>
          <div>
            <p className="font-display text-3xl font-black text-accent">{reviewedWeek}</p>
            <p className="text-xs font-bold uppercase text-muted-foreground">Nos últimos 7 dias</p>
          </div>
          <div>
            <p className="font-display text-3xl font-black text-accent">{fmtMs(avgMs)}</p>
            <p className="text-xs font-bold uppercase text-muted-foreground">Média por palavra</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-black">Acertos e erros por dia</p>
          <div className="flex items-end justify-between gap-2">
            {statDays.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full max-w-8 flex-col justify-end" title={`${d.right} acertos, ${d.wrong} erros`}>
                  <div className="w-full rounded-t bg-destructive/70" style={{ height: `${Math.round((d.wrong / maxAnswers) * 80)}px` }} />
                  <div className="w-full bg-accent" style={{ height: `${Math.round((d.right / maxAnswers) * 80)}px` }} />
                </div>
                <span className="text-xs font-bold">{d.right}/{d.right + d.wrong}</span>
                <span className="text-xs font-bold uppercase text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Verde = acertos · vermelho = erros</p>
        </div>
        <div>
          <p className="mb-2 text-sm font-black">Tempo no estudo diário · total da semana {fmtMs(weekMs)}</p>
          <div className="flex items-end justify-between gap-2">
            {statDays.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full max-w-8 flex-col justify-end">
                  <div className="w-full rounded-t bg-secondary" style={{ height: `${Math.round((d.studyMs / maxMs) * 80)}px` }} />
                </div>
                <span className="text-xs font-bold">{d.studyMs ? fmtMs(d.studyMs) : "—"}</span>
                <span className="text-xs font-bold uppercase text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <Trophy className="h-5 w-5 text-secondary" aria-hidden /> Conquistas ({unlocked}/{achievements.length})
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements.map((a) => (
            <div key={a.id} className={`paper-card flex flex-col gap-1 p-4 ${a.unlocked ? "" : "opacity-50"}`}>
              {a.unlocked ? (
                <Trophy className="h-6 w-6 text-secondary" aria-hidden />
              ) : (
                <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
              )}
              <p className="font-black">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="paper-card p-5 text-center">
            <p className="font-display text-4xl font-black text-accent">{card.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <button onClick={signOut} className="h-12 rounded-xl border-2 border-border bg-card font-bold hover:bg-muted">
        Sair da conta
      </button>
    </div>
  );
}

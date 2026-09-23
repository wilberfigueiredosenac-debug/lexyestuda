import { supabase } from "@/integrations/supabase/client";

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Registra uma atividade de estudo no dia de hoje (meta diária e sequência). */
export async function logStudy(amount = 1) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  await supabase.rpc("log_study", { _day: todayKey(), _amount: amount });
}

/** Dias seguidos com a meta cumprida, terminando hoje (ou ontem, se hoje ainda não foi cumprida). */
export function computeStreak(activity: { day: string; count: number }[], target: number) {
  const done = new Set(activity.filter((a) => a.count >= target).map((a) => a.day));
  const cursor = new Date();
  if (!done.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (done.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function bestStreak(activity: { day: string; count: number }[], target: number) {
  const days = activity
    .filter((a) => a.count >= target)
    .map((a) => a.day)
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const day of days) {
    const current = new Date(`${day}T12:00:00`);
    run = prev && Math.round((current.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = current;
  }
  return best;
}

export type Achievement = { id: string; title: string; description: string; unlocked: boolean };

export function computeAchievements(s: {
  saved: number;
  favorites: number;
  reviews: number;
  correct: number;
  plays: number;
  streak: number;
  best: number;
}): Achievement[] {
  return [
    { id: "first-word", title: "Primeira palavra", description: "Salve 1 palavra", unlocked: s.saved >= 1 },
    { id: "collector", title: "Colecionador", description: "Salve 25 palavras", unlocked: s.saved >= 25 },
    { id: "dictionary", title: "Dicionário ambulante", description: "Salve 100 palavras", unlocked: s.saved >= 100 },
    { id: "favorites", title: "Queridinhas", description: "Marque 5 favoritas", unlocked: s.favorites >= 5 },
    { id: "first-review", title: "Primeira revisão", description: "Responda 1 pergunta", unlocked: s.reviews >= 1 },
    { id: "sharp", title: "Mente afiada", description: "Acerte 50 perguntas", unlocked: s.correct >= 50 },
    { id: "listener", title: "Bom ouvinte", description: "Ouça 20 pronúncias", unlocked: s.plays >= 20 },
    { id: "streak-3", title: "Esquentando", description: "3 dias seguidos na meta", unlocked: s.best >= 3 },
    { id: "streak-7", title: "Semana perfeita", description: "7 dias seguidos na meta", unlocked: s.best >= 7 },
    { id: "streak-30", title: "Imparável", description: "30 dias seguidos na meta", unlocked: s.best >= 30 },
  ];
}

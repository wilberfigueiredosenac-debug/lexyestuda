import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { todayKey } from "@/lib/study";

/** Lembrete dentro do app (e notificação do navegador, se permitida) quando a meta do dia não foi cumprida após o horário escolhido. */
export function StudyReminder() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const data = useQuery({
    queryKey: ["study-today", user?.id, todayKey(now)],
    enabled: !!user,
    queryFn: async () => {
      const [goal, today] = await Promise.all([
        supabase.from("study_goals").select("*").maybeSingle(),
        supabase.from("study_activity").select("count").eq("day", todayKey()).maybeSingle(),
      ]);
      return { goal: goal.data, count: today.data?.count ?? 0 };
    },
    refetchInterval: 5 * 60_000,
  });

  const goal = data.data?.goal;
  const count = data.data?.count ?? 0;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const due =
    !!goal?.reminder_enabled && hhmm >= goal.reminder_time.slice(0, 5) && count < goal.daily_target;

  useEffect(() => {
    if (!due || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const key = `lexy-reminder-${todayKey()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    new Notification("LEXY — hora de estudar!", {
      body: `Faltam ${goal!.daily_target - count} atividades para sua meta de hoje.`,
    });
  }, [due, goal, count]);

  if (!due || dismissed) return null;

  return (
    <div className="paper-card mb-6 flex items-center gap-3 p-4">
      <Bell className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <p className="flex-1 text-sm font-bold">
        Faltam {goal!.daily_target - count} atividades para sua meta de hoje.{" "}
        <Link to="/exercicios" className="underline">
          Estudar agora
        </Link>
      </p>
      <button onClick={() => setDismissed(true)} aria-label="Fechar lembrete">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

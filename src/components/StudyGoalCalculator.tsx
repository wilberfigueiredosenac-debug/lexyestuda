import { Calculator, CalendarDays, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export function StudyGoalCalculator({ onUseGoal }: { onUseGoal: (daily: number) => void }) {
  const [words, setWords] = useState(30);
  const [days, setDays] = useState(14);
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  const result = useMemo(() => {
    const studyDays = Math.max(1, Math.ceil((days / 7) * daysPerWeek));
    const daily = Math.max(1, Math.ceil(words / studyDays));
    return { daily, weekly: daily * daysPerWeek, studyDays };
  }, [days, daysPerWeek, words]);

  return (
    <section className="paper-card flex flex-col gap-5 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <Calculator className="h-5 w-5 text-accent" aria-hidden /> Calculadora de meta
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Planeje um ritmo possível para alcançar seu objetivo.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-bold">
          Total de palavras
          <input type="number" min={1} max={10000} value={words} onChange={(event) => setWords(Math.max(1, Number(event.target.value) || 1))} className="h-11 rounded-xl border-2 border-border bg-card px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Prazo em dias
          <input type="number" min={1} max={3650} value={days} onChange={(event) => setDays(Math.max(1, Number(event.target.value) || 1))} className="h-11 rounded-xl border-2 border-border bg-card px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Dias por semana
          <input type="number" min={1} max={7} value={daysPerWeek} onChange={(event) => setDaysPerWeek(Math.max(1, Math.min(7, Number(event.target.value) || 1)))} className="h-11 rounded-xl border-2 border-border bg-card px-3" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <div className="rounded-xl bg-primary p-4 text-primary-foreground">
          <Target className="mb-2 h-5 w-5" aria-hidden />
          <p className="font-display text-4xl font-black">{result.daily}</p>
          <p className="text-sm font-bold">palavras por dia de estudo</p>
        </div>
        <div className="rounded-xl bg-secondary p-4 text-secondary-foreground">
          <CalendarDays className="mb-2 h-5 w-5" aria-hidden />
          <p className="font-display text-4xl font-black">{result.weekly}</p>
          <p className="text-sm font-bold">palavras por semana · {result.studyDays} dias de estudo</p>
        </div>
      </div>

      <Button type="button" size="lg" className="h-12 rounded-xl font-black" onClick={() => onUseGoal(result.daily)}>
        <Target aria-hidden /> Usar como meta diária
      </Button>
    </section>
  );
}
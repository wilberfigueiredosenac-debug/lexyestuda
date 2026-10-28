import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Gamepad2, Loader2, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getIntruderRound } from "@/lib/lexy.functions";

export const Route = createFileRoute("/jogos")({
  head: () => ({
    meta: [
      { title: "Caça ao Intruso — jogo de palavras | LEXY" },
      { name: "description", content: "Descubra a palavra que não é sinônima das outras antes do tempo acabar." },
      { property: "og:title", content: "Caça ao Intruso — jogo de palavras | LEXY" },
      { property: "og:description", content: "Descubra a palavra que não é sinônima das outras antes do tempo acabar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Jogos,
});

const ROUND_SECONDS = 60;

function Jogos() {
  const fetchRound = useServerFn(getIntruderRound);
  const [playing, setPlaying] = useState(false);
  const [left, setLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [n, setN] = useState(0);

  const round = useQuery({
    queryKey: ["intruder", n],
    enabled: playing,
    queryFn: () => fetchRound(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (left === 0) setPlaying(false);
  }, [left]);

  function start() {
    setScore(0);
    setMisses(0);
    setLeft(ROUND_SECONDS);
    setPicked(null);
    setN((x) => x + 1);
    setPlaying(true);
  }

  function choose(option: string) {
    const r = round.data?.round;
    if (!r || picked) return;
    setPicked(option);
    if (option === r.intruder) setScore((s) => s + 1);
    else setMisses((m) => m + 1);
    setTimeout(() => {
      setPicked(null);
      setN((x) => x + 1);
    }, 800);
  }

  const r = round.data?.round;
  return (
    <div className="content-enter mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-black">
          <Gamepad2 className="h-7 w-7 text-accent" aria-hidden /> Caça ao Intruso
        </h1>
        <p className="mt-1 text-muted-foreground">
          Três palavras têm o mesmo sentido. Clique na intrusa! Você tem {ROUND_SECONDS} segundos.
        </p>
      </header>

      <div className="paper-card flex items-center justify-between p-4 font-black">
        <span className="flex items-center gap-2"><Timer className="h-5 w-5 text-accent" aria-hidden /> {left}s</span>
        <span>Acertos: {score}</span>
        <span className="text-muted-foreground">Erros: {misses}</span>
      </div>

      {!playing ? (
        <div className="paper-card flex flex-col items-center gap-4 p-8 text-center">
          {left === 0 && <p className="font-display text-2xl font-black">Fim! Você fez {score} ponto(s).</p>}
          <Button size="lg" onClick={start}>
            <RotateCcw className="mr-2 h-4 w-4" /> {left === 0 ? "Jogar de novo" : "Começar"}
          </Button>
        </div>
      ) : round.isPending ? (
        <div className="paper-card flex items-center justify-center gap-2 p-10"><Loader2 className="h-5 w-5 animate-spin" /> Preparando...</div>
      ) : !r ? (
        <p className="paper-card p-6">Ainda há poucas palavras no LEXY para o jogo. Pesquise algumas palavras e volte!</p>
      ) : (
        <div className="paper-card flex flex-col gap-4 p-6">
          <p className="text-center text-sm font-bold text-muted-foreground">Qual palavra NÃO combina com as outras?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.options.map((o) => {
              const state = picked ? (o === r.intruder ? "border-secondary bg-secondary/15" : o === picked ? "border-destructive bg-destructive/10" : "opacity-60") : "";
              return (
                <button
                  key={o}
                  onClick={() => choose(o)}
                  className={`interactive-card rounded-2xl border-2 border-border bg-card p-5 text-xl font-black ${state}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {picked && <p className="text-center text-sm">As outras são sinônimos de <strong>{r.base}</strong>.</p>}
        </div>
      )}
    </div>
  );
}

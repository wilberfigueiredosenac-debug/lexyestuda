import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/reforco")({
  head: () => ({
    meta: [
      { title: "Precisa de atenção | LEXY" },
      { name: "description", content: "As palavras em que você mais errou nos exercícios, para reforçar o estudo." },
      { property: "og:title", content: "Precisa de atenção | LEXY" },
      { property: "og:description", content: "As palavras em que você mais errou nos exercícios, para reforçar o estudo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reforco,
});

function Reforco() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["reforco", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("term, correct").order("created_at", { ascending: false }).limit(500);
      const map = new Map<string, { right: number; wrong: number }>();
      for (const r of data ?? []) {
        const k = r.term.toLowerCase();
        const v = map.get(k) ?? { right: 0, wrong: 0 };
        if (r.correct) v.right++;
        else v.wrong++;
        map.set(k, v);
      }
      return [...map.entries()]
        .filter(([, v]) => v.wrong > 0)
        .sort((a, b) => b[1].wrong - b[1].right - (a[1].wrong - a[1].right))
        .slice(0, 30);
    },
  });

  return (
    <div className="content-enter flex flex-col gap-6 py-4">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-black">
          <Target className="h-7 w-7 text-accent" aria-hidden /> Precisa de atenção
        </h1>
        <p className="mt-1 text-muted-foreground">Palavras em que você errou nos exercícios. Revise uma por uma.</p>
      </header>
      {q.data && q.data.length === 0 && <p className="paper-card p-6">Nenhum erro por aqui. Continue estudando!</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(q.data ?? []).map(([term, v]) => (
          <Link key={term} to="/palavra/$termo" params={{ termo: term }} className="paper-card interactive-card flex items-center justify-between p-4">
            <span className="font-display text-lg font-black">{term}</span>
            <span className="text-sm"><span className="text-destructive">{v.wrong} erro(s)</span> · {v.right} acerto(s)</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

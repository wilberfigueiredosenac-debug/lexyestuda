import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LEXY — Seu vocabulário, do seu jeito" },
      {
        name: "description",
        content:
          "Pesquise uma palavra, entenda seus significados e contextos e salve tudo no seu vocabulário pessoal.",
      },
      { property: "og:title", content: "LEXY — Seu vocabulário, do seu jeito" },
      {
        property: "og:description",
        content: "Pesquise, entenda, salve e revise palavras da Língua Portuguesa.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();

  const recent = useQuery({
    queryKey: ["recent-searches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("search_history")
        .select("term, created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      const seen = new Set<string>();
      return (data ?? []).filter((row) => {
        if (seen.has(row.term)) return false;
        seen.add(row.term);
        return true;
      });
    },
  });

  return (
    <div className="flex flex-col gap-10 py-6">
      <section className="text-center">
        <h1 className="font-display text-6xl font-black tracking-tight sm:text-7xl">LEXY</h1>
        <p className="mt-2 text-lg text-muted-foreground">Seu vocabulário, do seu jeito.</p>
      </section>

      <SearchBar />

      {user && (recent.data?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-muted-foreground">
            Pesquisadas recentemente
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.data!.map((row) => (
              <Link
                key={row.term}
                to="/palavra/$termo"
                params={{ termo: row.term }}
                className="rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-bold hover:bg-muted"
              >
                {row.term}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/vocabulario" className="paper-card flex items-start gap-3 p-5 hover:bg-muted">
          <BookMarked className="mt-1 h-6 w-6 text-accent" aria-hidden />
          <span>
            <span className="block font-display text-xl font-black">Meu vocabulário</span>
            <span className="text-sm text-muted-foreground">
              Um caderno digital com todas as palavras que você salvou.
            </span>
          </span>
        </Link>
        <Link to="/revisao" className="paper-card flex items-start gap-3 p-5 hover:bg-muted">
          <Sparkles className="mt-1 h-6 w-6 text-accent" aria-hidden />
          <span>
            <span className="block font-display text-xl font-black">Revisão</span>
            <span className="text-sm text-muted-foreground">
              Perguntas feitas a partir das suas próprias palavras.
            </span>
          </span>
        </Link>
      </section>

      {!user && (
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-bold underline">
            Crie sua conta
          </Link>{" "}
          para salvar palavras e revisar depois.
        </p>
      )}
    </div>
  );
}

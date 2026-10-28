import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, Gamepad2, PenLine, Route as RouteIcon, Sparkles, Star, Target } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getWordOfDay, lookupWord } from "@/lib/lexy.functions";
import { PronounceButton } from "@/components/PronounceButton";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/lexy-book-logo.png.asset.json";

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
    <div className="content-enter flex flex-col gap-10 py-6">
      <section className="text-center">
        <h1 className="sr-only">LEXY</h1>
        <img src={logo.url} alt="" aria-hidden className="mx-auto h-36 w-auto object-contain sm:h-44" />
        <p className="mt-2 text-lg text-muted-foreground">Seu vocabulário, do seu jeito.</p>
      </section>

      <SearchBar />

      <WordOfDay />

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
              className="rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-muted"
              >
                {row.term}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/vocabulario" className="paper-card interactive-card flex items-start gap-3 p-5 hover:bg-muted">
          <BookMarked className="mt-1 h-6 w-6 text-accent" aria-hidden />
          <span>
            <span className="block font-display text-xl font-black">Meu vocabulário</span>
            <span className="text-sm text-muted-foreground">
              Um caderno digital com todas as palavras que você salvou.
            </span>
          </span>
        </Link>
        <Link to="/revisao" className="paper-card interactive-card flex items-start gap-3 p-5 hover:bg-muted">
          <Sparkles className="mt-1 h-6 w-6 text-accent" aria-hidden />
          <span>
            <span className="block font-display text-xl font-black">Revisão</span>
            <span className="text-sm text-muted-foreground">
              Perguntas feitas a partir das suas próprias palavras.
            </span>
          </span>
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/jogos", icon: Gamepad2, title: "Caça ao Intruso", text: "Jogo rápido de sinônimos." },
          { to: "/trilhas", icon: RouteIcon, title: "Trilhas", text: "Coleções prontas de palavras." },
          { to: "/redacao", icon: PenLine, title: "Redação", text: "Melhore o vocabulário do seu texto." },
          { to: "/reforco", icon: Target, title: "Precisa de atenção", text: "Palavras em que você errou." },
        ].map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="paper-card interactive-card flex flex-col gap-1 p-4 hover:bg-muted">
            <Icon className="h-6 w-6 text-accent" aria-hidden />
            <span className="font-display text-lg font-black">{title}</span>
            <span className="text-sm text-muted-foreground">{text}</span>
          </Link>
        ))}
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

function WordOfDay() {
  const getDay = useServerFn(getWordOfDay);
  const lookup = useServerFn(lookupWord);
  const day = useQuery({ queryKey: ["word-of-day"], queryFn: () => getDay(), staleTime: 3_600_000 });
  const term = day.data?.term;
  const word = useQuery({
    queryKey: ["word", term],
    enabled: !!term,
    queryFn: () => lookup({ data: { term: term! } }),
    staleTime: Infinity,
  });
  if (!term) return null;
  const w = word.data?.word;
  return (
    <section className="paper-card interactive-card flex flex-col gap-3 p-5">
      <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-accent">
        <Star className="h-4 w-4" aria-hidden /> Palavra do dia
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/palavra/$termo" params={{ termo: term }} className="font-display text-3xl font-black hover:underline">
          {w?.display_term ?? term}
        </Link>
        {w?.word_class && <span className="text-sm italic text-muted-foreground">{w.word_class}</span>}
        <PronounceButton term={term} wordId={w?.id ?? null} />
      </div>
      {w ? <p>{w.meaning}</p> : <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />}
      <Link to="/palavra/$termo" params={{ termo: term }} className="self-start text-sm font-bold underline">
        Ver tudo e salvar no vocabulário
      </Link>
    </section>
  );
}

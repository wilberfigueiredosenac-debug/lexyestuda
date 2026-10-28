import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { lookupWord, recordSearch } from "@/lib/lexy.functions";
import { WordDetails } from "@/components/WordDetails";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { logStudy } from "@/lib/study";

export const Route = createFileRoute("/palavra/$termo")({
  head: ({ params }) => {
    const term = decodeURIComponent(params.termo);
    return {
      meta: [
        { title: `${term} — significado e exemplos | LEXY` },
        {
          name: "description",
          content: `Veja o significado, a classe gramatical, exemplos e os diferentes sentidos da palavra ${term}.`,
        },
        { property: "og:title", content: `${term} — significado e exemplos | LEXY` },
        {
          property: "og:description",
          content: `Significado, exemplos, sinônimos e polissemia da palavra ${term}.`,
        },
      ],
    };
  },
  component: WordPage,
});

function WordPage() {
  const { termo } = Route.useParams();
  const term = decodeURIComponent(termo);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lookup = useServerFn(lookupWord);
  const track = useServerFn(recordSearch);

  const query = useQuery({
    queryKey: ["word", term],
    queryFn: () => lookup({ data: { term } }),
    retry: false,
  });

  const word = query.data?.word ?? null;

  useEffect(() => {
    if (user && word) void track({ data: { term } });
  }, [user, word, term, track]);

  const saved = useQuery({
    queryKey: ["vocab-entry", user?.id, word?.id],
    enabled: !!user && !!word,
    queryFn: async () => {
      const { data } = await supabase
        .from("vocabulary")
        .select("id")
        .eq("word_id", word!.id)
        .maybeSingle();
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user || !word) throw new Error("Entre na sua conta para salvar palavras.");
      const { error } = await supabase
        .from("vocabulary")
        .insert({ user_id: user.id, word_id: word.id });
      if (error) throw error;
      await logStudy();
    },
    onSuccess: () => {
      toast.success("Palavra adicionada ao seu vocabulário!");
      void queryClient.invalidateQueries({ queryKey: ["vocab-entry"] });
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não deu certo."),
  });

  return (
    <div className="flex flex-col gap-6 py-2">
      <SearchBar initialTerm={term} />

      {query.isPending && (
        <div className="paper-card flex flex-col gap-4 p-6" aria-busy>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
            <p className="font-display text-2xl font-black">{term}</p>
          </div>
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="mt-2 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-muted" />
            ))}
          </div>
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      )}

      {query.isError && (
        <div className="paper-card p-6">
          <p className="font-bold">Não conseguimos pesquisar agora.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.error instanceof Error ? query.error.message : "Tente novamente."}
          </p>
          <button
            onClick={() => query.refetch()}
            className="mt-4 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {query.data?.notFound && (
        <div className="paper-card p-6">
          <p className="font-bold">Não encontramos “{term}” na Língua Portuguesa.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Confira a escrita e pesquise novamente.
          </p>
        </div>
      )}

      {word && (
        <>
          <WordDetails word={word} />
          {user ? (
            saved.data ? (
              <Link
                to="/vocabulario"
                className="rounded-2xl border-2 border-accent bg-card py-4 text-center font-black text-accent"
              >
                Já está no seu vocabulário — ver caderno
              </Link>
            ) : (
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="flex items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-lg font-black text-accent-foreground disabled:opacity-60"
              >
                <Plus className="h-5 w-5" aria-hidden /> Adicionar ao meu vocabulário
              </button>
            )
          ) : (
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="rounded-2xl bg-accent py-4 text-lg font-black text-accent-foreground"
            >
              Entrar para salvar esta palavra
            </button>
          )}
        </>
      )}
    </div>
  );
}

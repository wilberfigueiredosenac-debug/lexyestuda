import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WordDetails } from "@/components/WordDetails";
import { useAuth } from "@/lib/auth";
import type { WordRow } from "@/lib/lexy.functions";

export const Route = createFileRoute("/_authenticated/vocabulario")({
  head: () => ({
    meta: [
      { title: "Meu vocabulário | LEXY" },
      {
        name: "description",
        content: "Seu caderno digital com todas as palavras que você salvou, anotações e favoritas.",
      },
      { property: "og:title", content: "Meu vocabulário | LEXY" },
      {
        property: "og:description",
        content: "Palavras salvas, anotações pessoais e favoritas no LEXY.",
      },
    ],
  }),
  component: VocabularyPage,
});

type Entry = {
  id: string;
  note: string;
  favorite: boolean;
  created_at: string;
  words: WordRow | null;
};

function VocabularyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const list = useQuery({
    queryKey: ["vocabulary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, note, favorite, created_at, words(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Entry[];
    },
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; note?: string; favorite?: boolean }) => {
      const { id, ...values } = input;
      const { error } = await supabase.from("vocabulary").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vocabulary"] }),
    onError: () => toast.error("Não foi possível salvar a alteração."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vocabulary").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Palavra removida do seu vocabulário.");
      setOpenId(null);
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-entry"] });
    },
    onError: () => toast.error("Não foi possível excluir a palavra."),
  });

  const entries = (list.data ?? []).filter((entry) => {
    if (onlyFavorites && !entry.favorite) return false;
    const term = entry.words?.display_term ?? "";
    return term.toLowerCase().includes(search.trim().toLowerCase());
  });

  const open = entries.find((entry) => entry.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <h1 className="font-display text-4xl font-black uppercase">Meu vocabulário</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {list.data?.length ?? 0} palavra(s) salvas no seu caderno.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar nas suas palavras"
          aria-label="Buscar nas suas palavras"
          className="h-12 flex-1 rounded-xl border-2 border-border bg-card px-4 outline-none focus:border-ring"
        />
        <button
          onClick={() => setOnlyFavorites((value) => !value)}
          className={`h-12 rounded-xl border-2 border-border px-5 font-bold ${
            onlyFavorites ? "bg-secondary text-secondary-foreground" : "bg-card"
          }`}
        >
          Só favoritas
        </button>
      </div>

      {list.isPending && <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden />}

      {!list.isPending && entries.length === 0 && (
        <div className="paper-card p-6">
          <p className="font-bold">Seu caderno ainda está vazio.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pesquise uma palavra na tela inicial e toque em “Adicionar ao meu vocabulário”.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="paper-card flex items-center gap-3 p-4">
            <button
              onClick={() => {
                setOpenId(entry.id);
                setNoteDraft(entry.note);
              }}
              className="flex-1 text-left"
            >
              <span className="block font-display text-xl font-black uppercase">
                {entry.words?.display_term}
              </span>
              <span className="line-clamp-1 text-sm text-muted-foreground">
                {entry.words?.meaning}
              </span>
            </button>
            <button
              aria-label={entry.favorite ? "Remover dos favoritos" : "Marcar como favorita"}
              onClick={() => update.mutate({ id: entry.id, favorite: !entry.favorite })}
              className="p-2"
            >
              <Star
                className={`h-5 w-5 ${entry.favorite ? "fill-secondary text-secondary" : "text-muted-foreground"}`}
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>

      {open?.words && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-background p-4 sm:rounded-3xl">
            <div className="mb-3 flex justify-end">
              <button onClick={() => setOpenId(null)} className="font-bold underline">
                Fechar
              </button>
            </div>
            <WordDetails word={open.words} />

            <div className="paper-card mt-4 flex flex-col gap-3 p-4">
              <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Minha anotação
              </label>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={3}
                placeholder="Ex.: encontrei essa palavra no livro que estou lendo."
                className="rounded-xl border-2 border-border bg-background p-3 outline-none focus:border-ring"
              />
              <button
                onClick={() => {
                  update.mutate({ id: open.id, note: noteDraft });
                  toast.success("Anotação salva.");
                }}
                className="h-11 rounded-xl bg-primary font-black text-primary-foreground"
              >
                Salvar anotação
              </button>
            </div>

            <button
              onClick={() => {
                if (confirm("Excluir esta palavra do seu vocabulário?")) remove.mutate(open.id);
              }}
              className="mt-4 mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-destructive py-3 font-bold text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Excluir palavra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

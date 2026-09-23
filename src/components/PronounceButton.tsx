import { useRef, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logStudy } from "@/lib/study";

const cache = new Map<string, string>();

export function PronounceButton({ term, wordId }: { term: string; wordId?: string | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function play() {
    if (loading) return;
    setLoading(true);
    try {
      let url = cache.get(term);
      if (!url) {
        const res = await fetch("/api/pronuncia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: term }),
        });
        if (!res.ok) throw new Error((await res.text()) || "Não foi possível gerar o áudio.");
        url = URL.createObjectURL(await res.blob());
        cache.set(term, url);
      }
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
      if (user) {
        await supabase.rpc("log_pronunciation", { _word_id: wordId ?? null, _term: term } as never);
        void logStudy();
        void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
        void queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível tocar o áudio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={`Ouvir a pronúncia de ${term}`}
      className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-bold hover:bg-muted"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Volume2 className="h-4 w-4 text-accent" aria-hidden />
      )}
      Ouvir
    </button>
  );
}

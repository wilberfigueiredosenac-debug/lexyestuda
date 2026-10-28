import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Mic, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { suggestWords } from "@/lib/lexy.functions";

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
};

export function SearchBar({ initialTerm = "" }: { initialTerm?: string }) {
  const [term, setTerm] = useState(initialTerm);
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const navigate = useNavigate();
  const suggest = useServerFn(suggestWords);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 200);
    return () => clearTimeout(id);
  }, [term]);

  const suggestions = useQuery({
    queryKey: ["suggest", debounced.toLowerCase()],
    enabled: debounced.length >= 2 && open,
    staleTime: 60_000,
    queryFn: () => suggest({ data: { prefix: debounced } }),
  });

  function go(value: string) {
    const v = value.trim();
    if (!v) return;
    setOpen(false);
    navigate({ to: "/palavra/$termo", params: { termo: v.toLowerCase() } });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    go(term);
  }

  function listen() {
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Seu navegador não permite pesquisa por voz.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript?.trim().split(/\s+/)[0] ?? "";
      if (said) {
        setTerm(said);
        go(said);
      }
    };
    rec.onerror = () => toast.error("Não consegui ouvir. Tente de novo.");
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  const list = (suggestions.data?.terms ?? []).filter((t) => t !== term.trim().toLowerCase());

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Pesquise uma palavra..."
          aria-label="Pesquise uma palavra"
          autoComplete="off"
          className="h-14 w-full rounded-2xl border-2 border-border bg-card pl-12 pr-14 text-lg outline-none focus:border-ring"
        />
        <button
          type="button"
          onClick={listen}
          aria-label="Pesquisar por voz"
          className={`absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl transition hover:bg-muted ${listening ? "animate-pulse text-accent" : "text-muted-foreground"}`}
        >
          <Mic className="h-5 w-5" aria-hidden />
        </button>
        {open && list.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-lg">
            {list.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(t)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left font-bold hover:bg-muted"
                >
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden /> {t}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        className="h-14 rounded-2xl bg-secondary px-8 text-lg font-black text-secondary-foreground transition hover:opacity-90"
      >
        Pesquisar
      </button>
    </form>
  );
}

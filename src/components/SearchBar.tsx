import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";

export function SearchBar({ initialTerm = "" }: { initialTerm?: string }) {
  const [term, setTerm] = useState(initialTerm);
  const navigate = useNavigate();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = term.trim();
    if (!value) return;
    navigate({ to: "/palavra/$termo", params: { termo: value.toLowerCase() } });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Pesquise uma palavra..."
          aria-label="Pesquise uma palavra"
          className="h-14 w-full rounded-2xl border-2 border-border bg-card pl-12 pr-4 text-lg outline-none focus:border-ring"
        />
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { analyzeEssay } from "@/lib/lexy.functions";

export const Route = createFileRoute("/_authenticated/redacao")({
  head: () => ({
    meta: [
      { title: "Vocabulário da redação | LEXY" },
      { name: "description", content: "Cole sua redação e receba sugestões de sinônimos e termos mais formais." },
      { property: "og:title", content: "Vocabulário da redação | LEXY" },
      { property: "og:description", content: "Cole sua redação e receba sugestões de sinônimos e termos mais formais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Redacao,
});

function Redacao() {
  const [text, setText] = useState("");
  const analyze = useServerFn(analyzeEssay);
  const run = useMutation({
    mutationFn: () => analyze({ data: { text } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu certo."),
  });
  const r = run.data;

  return (
    <div className="content-enter flex flex-col gap-6 py-4">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-black">
          <PenLine className="h-7 w-7 text-accent" aria-hidden /> Vocabulário da redação
        </h1>
        <p className="mt-1 text-muted-foreground">Cole um parágrafo e veja palavras repetidas, trechos informais e sugestões.</p>
      </header>
      <div className="paper-card flex flex-col gap-3 p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          rows={8}
          placeholder="Hoje em dia, a tecnologia é muito importante..."
          className="w-full rounded-xl border-2 border-border bg-card p-4 outline-none focus:border-ring"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{text.length}/4000</span>
          <Button onClick={() => run.mutate()} disabled={text.trim().length < 20 || run.isPending}>
            {run.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Analisar
          </Button>
        </div>
      </div>

      {r && (
        <div className="flex flex-col gap-4">
          <p className="paper-card p-5 font-bold">{r.summary}</p>
          {r.repeated.length > 0 && (
            <section className="paper-card p-5">
              <h2 className="mb-3 font-display text-xl font-black">Palavras repetidas</h2>
              <ul className="flex flex-col gap-3">
                {r.repeated.map((x) => (
                  <li key={x.word}>
                    <strong>{x.word}</strong> <span className="text-muted-foreground">({x.count}x)</span> → troque por{" "}
                    {x.suggestions.map((s, i) => (
                      <span key={s}>
                        <Link to="/palavra/$termo" params={{ termo: s.toLowerCase() }} className="font-bold text-accent underline">{s}</Link>
                        {i < x.suggestions.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {r.informal.length > 0 && (
            <section className="paper-card p-5">
              <h2 className="mb-3 font-display text-xl font-black">Trechos para melhorar</h2>
              <ul className="flex flex-col gap-3">
                {r.informal.map((x) => (
                  <li key={x.excerpt}>
                    “{x.excerpt}” → <strong>{x.suggestion}</strong>
                    <p className="text-sm text-muted-foreground">{x.why}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="paper-card p-5">
            <h2 className="mb-3 font-display text-xl font-black">Versão sugerida</h2>
            <p className="whitespace-pre-line">{r.improvedText}</p>
          </section>
        </div>
      )}
    </div>
  );
}

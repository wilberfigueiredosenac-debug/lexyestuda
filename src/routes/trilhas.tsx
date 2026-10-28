import { createFileRoute, Link } from "@tanstack/react-router";
import { Route as RouteIcon } from "lucide-react";

export const Route = createFileRoute("/trilhas")({
  head: () => ({
    meta: [
      { title: "Trilhas de palavras | LEXY" },
      { name: "description", content: "Coleções prontas de palavras para o ENEM, clássicos da literatura e regionalismos." },
      { property: "og:title", content: "Trilhas de palavras | LEXY" },
      { property: "og:description", content: "Coleções prontas de palavras para o ENEM, clássicos da literatura e regionalismos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Trilhas,
});

const TRAILS = [
  { title: "Palavras de ouro para o ENEM", desc: "Termos que elevam o nível da redação.", words: ["paradigma", "negligência", "fulcro", "estigma", "conjuntura", "hodierno", "dirimir", "mitigar"] },
  { title: "Vocabulário dos clássicos", desc: "Palavras comuns em Machado, Alencar e Clarice.", words: ["outrora", "alvoroço", "enfado", "melancolia", "volúvel", "dissimulado", "soberbo", "lânguido"] },
  { title: "Expressões e regionalismos", desc: "Jeitos de falar de cada canto do Brasil.", words: ["oxente", "bah", "trem", "macaxeira", "guri", "arretado", "mandioca", "aipim"] },
  { title: "Palavras difíceis do dia a dia", desc: "Aquelas que todo mundo ouve, mas poucos explicam.", words: ["procrastinar", "resiliência", "altruísmo", "efêmero", "empatia", "inefável", "perspicaz", "ubíquo"] },
];

function Trilhas() {
  return (
    <div className="content-enter flex flex-col gap-6 py-4">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-black">
          <RouteIcon className="h-7 w-7 text-accent" aria-hidden /> Trilhas de palavras
        </h1>
        <p className="mt-1 text-muted-foreground">Escolha uma trilha, abra cada palavra e salve no seu vocabulário.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {TRAILS.map((t) => (
          <section key={t.title} className="paper-card interactive-card flex flex-col gap-3 p-5">
            <h2 className="font-display text-xl font-black">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{t.desc}</p>
            <div className="flex flex-wrap gap-2">
              {t.words.map((w) => (
                <Link key={w} to="/palavra/$termo" params={{ termo: w }} className="rounded-full border-2 border-border bg-card px-3 py-1 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-muted">
                  {w}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

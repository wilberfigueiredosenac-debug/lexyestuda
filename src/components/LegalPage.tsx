import type { ReactNode } from "react";

export const LEGAL_UPDATED = "25 de novembro de 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="content-enter paper-card mx-auto flex max-w-3xl flex-col gap-4 p-6 leading-relaxed sm:p-8 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="font-display text-3xl font-black sm:text-4xl">{title}</h1>
      <p className="text-sm text-muted-foreground">Última atualização: {LEGAL_UPDATED}</p>
      {children}
    </article>
  );
}

export function legalHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | LEXY` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | LEXY` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}

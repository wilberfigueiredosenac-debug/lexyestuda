import type { WordRow } from "@/lib/lexy.functions";

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-black uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="text-base leading-relaxed">{children}</div>
    </section>
  );
}

export function WordDetails({ word }: { word: WordRow }) {
  const otherMeanings = asList(word.other_meanings);
  const examples = asList(word.examples);
  const synonyms = asList(word.synonyms);
  const antonyms = asList(word.antonyms);

  return (
    <article className="paper-card flex flex-col gap-5 p-6">
      <header>
        <h2 className="font-display text-4xl font-black uppercase tracking-tight">
          {word.display_term}
        </h2>
        {word.word_class && (
          <p className="mt-1 inline-block rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
            {word.word_class}
          </p>
        )}
      </header>

      <Block title="Significado">{word.meaning}</Block>

      {otherMeanings.length > 0 && (
        <Block title="Outros significados">
          <ul className="list-disc space-y-1 pl-5">
            {otherMeanings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Block>
      )}

      {examples.length > 0 && (
        <Block title="Exemplos">
          <ul className="space-y-1">
            {examples.map((item) => (
              <li key={item} className="italic">
                “{item}”
              </li>
            ))}
          </ul>
        </Block>
      )}

      {(synonyms.length > 0 || antonyms.length > 0) && (
        <div className="grid gap-5 sm:grid-cols-2">
          {synonyms.length > 0 && (
            <Block title="Sinônimos">
              <div className="flex flex-wrap gap-2">
                {synonyms.map((item) => (
                  <span key={item} className="rounded-full bg-muted px-3 py-1 text-sm font-bold">
                    {item}
                  </span>
                ))}
              </div>
            </Block>
          )}
          {antonyms.length > 0 && (
            <Block title="Antônimos">
              <div className="flex flex-wrap gap-2">
                {antonyms.map((item) => (
                  <span key={item} className="rounded-full bg-muted px-3 py-1 text-sm font-bold">
                    {item}
                  </span>
                ))}
              </div>
            </Block>
          )}
        </div>
      )}

      {word.polysemy && <Block title="Polissemia">{word.polysemy}</Block>}
      {word.context_note && <Block title="Uso no contexto">{word.context_note}</Block>}
      {word.regional_note && <Block title="Variação linguística">{word.regional_note}</Block>}
    </article>
  );
}

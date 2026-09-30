import { createFileRoute } from "@tanstack/react-router";
import { ExerciseRunner } from "@/components/ExerciseRunner";

export const Route = createFileRoute("/_authenticated/tema")({
  head: () => ({
    meta: [
      { title: "Exercícios por tema | LEXY" },
      {
        name: "description",
        content: "Escolha um tema e o LEXY cria perguntas e frases de vocabulário sobre ele, sem pesquisar palavra a palavra.",
      },
      { property: "og:title", content: "Exercícios por tema | LEXY" },
      { property: "og:description", content: "Exercícios de vocabulário gerados por tema com IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ExerciseRunner variant="tema" />,
});

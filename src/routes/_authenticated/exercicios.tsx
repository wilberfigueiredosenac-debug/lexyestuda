import { createFileRoute } from "@tanstack/react-router";
import { ExerciseRunner } from "@/components/ExerciseRunner";

export const Route = createFileRoute("/_authenticated/exercicios")({
  head: () => ({
    meta: [
      { title: "Exercícios personalizados | LEXY" },
      {
        name: "description",
        content: "Envie uma palavra, um texto ou um tema e receba exercícios de vocabulário feitos para você.",
      },
      { property: "og:title", content: "Exercícios personalizados | LEXY" },
      {
        property: "og:description",
        content: "Exercícios de vocabulário criados com IA a partir de palavras, textos ou temas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExercisesPage,
});

function ExercisesPage() {
  return <ExerciseRunner />;
}

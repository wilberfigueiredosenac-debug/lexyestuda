import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { displayName, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | LEXY" },
      {
        name: "description",
        content: "Veja seu progresso no LEXY: palavras salvas, favoritas e desempenho nas revisões.",
      },
      { property: "og:title", content: "Meu perfil | LEXY" },
      { property: "og:description", content: "Seu progresso de vocabulário no LEXY." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const stats = useQuery({
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      const [saved, favorites, reviews, correct] = await Promise.all([
        supabase.from("vocabulary").select("id", { count: "exact", head: true }),
        supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("favorite", true),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("correct", true),
      ]);
      return {
        saved: saved.count ?? 0,
        favorites: favorites.count ?? 0,
        reviews: reviews.count ?? 0,
        correct: correct.count ?? 0,
      };
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const cards = [
    { label: "Palavras salvas", value: stats.data?.saved ?? 0 },
    { label: "Favoritas", value: stats.data?.favorites ?? 0 },
    { label: "Perguntas respondidas", value: stats.data?.reviews ?? 0 },
    { label: "Acertos", value: stats.data?.correct ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <h1 className="font-display text-4xl font-black uppercase">Perfil</h1>
        <p className="mt-1 text-lg font-bold">{displayName(user)}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="paper-card p-5 text-center">
            <p className="font-display text-4xl font-black text-accent">{card.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={signOut}
        className="h-12 rounded-xl border-2 border-border bg-card font-bold hover:bg-muted"
      >
        Sair da conta
      </button>
    </div>
  );
}

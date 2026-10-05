import { Link } from "@tanstack/react-router";
import { BookMarked, CalendarCheck, Home, Sparkles, User, Wand2 } from "lucide-react";
import { StudyReminder } from "@/components/StudyReminder";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/lexy-logo.png.asset.json";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/vocabulario", label: "Vocabulário", icon: BookMarked },
  { to: "/estudo", label: "Estudo", icon: CalendarCheck },
  { to: "/revisao", label: "Revisão", icon: Sparkles },
  { to: "/exercicios", label: "Exercícios", icon: Wand2 },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b-2 border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-1.5">
          <Link to="/" className="relative z-30 flex items-end" aria-label="LEXY — início">
            <img src={logo.url} alt="LEXY" className="-mb-6 h-20 w-auto sm:-mb-8 sm:h-24" />
          </Link>
          {!loading &&
            (user ? (
              <Link
                to="/perfil"
                className="rounded-full border-2 border-border px-4 py-1.5 text-sm font-bold hover:bg-muted"
              >
                Minha conta
              </Link>
            ) : (
              <Link
                to="/auth"
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Entrar
              </Link>
            ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-6">
        {user && <StudyReminder />}
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t-2 border-border bg-background">
        <div className="mx-auto flex w-full max-w-4xl">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-bold text-muted-foreground transition-colors"
              activeProps={{ className: "text-accent" }}
              activeOptions={{ exact: to === "/" }}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

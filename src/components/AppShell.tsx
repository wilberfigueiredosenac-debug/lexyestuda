import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookMarked, CalendarCheck, Home, LogOut, Palette, Sparkles, User, Wand2 } from "lucide-react";
import { StudyReminder } from "@/components/StudyReminder";
import type { ReactNode } from "react";
import { displayName, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/lexy-book-logo.png.asset.json";
import { ThemePicker } from "@/components/ThemePicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/vocabulario", label: "Vocabulário", icon: BookMarked },
  { to: "/estudo", label: "Estudo", icon: CalendarCheck },
  { to: "/revisao", label: "Revisão", icon: Sparkles },
  { to: "/exercicios", label: "Exercícios", icon: Wand2 },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  if (!user) return null;
  const name = displayName(user);
  const meta = user.user_metadata as { avatar_url?: string; picture?: string } | undefined;
  const avatar = meta?.avatar_url || meta?.picture;
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full border-2 border-border bg-card p-0.5 pr-0.5 transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-3"
        aria-label="Abrir menu da conta"
      >
        <Avatar className="h-9 w-9">
          {avatar && <AvatarImage src={avatar} alt="" />}
          <AvatarFallback className="bg-primary font-black text-primary-foreground">{initials || "L"}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[10rem] truncate text-sm font-bold sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="min-w-0">
          <span className="block truncate font-black">{name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/perfil"><User className="mr-2 h-4 w-4" />Meu perfil</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/vocabulario"><BookMarked className="mr-2 h-4 w-4" />Meu vocabulário</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/estudo"><CalendarCheck className="mr-2 h-4 w-4" />Estudo diário</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/tema"><Palette className="mr-2 h-4 w-4" />Exercícios por tema</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b-2 border-border bg-background/95 shadow-sm backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:h-20 lg:flex lg:justify-between">
          <Link to="/" className="flex min-w-0 shrink-0 items-center" aria-label="LEXY — início">
            <img src={logo.url} alt="LEXY" className="h-12 w-auto object-contain sm:h-16" />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
                activeOptions={{ exact: to === "/" }}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <ThemePicker compact />
            {!loading &&
              (user ? (
                <UserMenu />
              ) : (
                <Link
                  to="/auth"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  Entrar
                </Link>
              ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-6 md:px-6 lg:max-w-5xl lg:pb-12 xl:max-w-6xl">
        {user && <StudyReminder />}
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t-2 border-border bg-background lg:hidden" aria-label="Navegação">
        <div className="mx-auto flex w-full max-w-4xl">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-[11px] font-bold text-muted-foreground transition duration-200 hover:-translate-y-0.5 hover:text-foreground sm:text-xs"
              activeProps={{ className: "text-accent" }}
              activeOptions={{ exact: to === "/" }}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

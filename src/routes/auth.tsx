import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no LEXY" },
      {
        name: "description",
        content: "Crie sua conta ou entre no LEXY para salvar palavras no seu vocabulário pessoal.",
      },
      { property: "og:title", content: "Entrar no LEXY" },
      {
        property: "og:description",
        content: "Crie sua conta ou entre no LEXY para salvar e revisar palavras.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: name.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmSent(true);
          toast.success("Confira seu e-mail para confirmar a conta.");
          return;
        }
        toast.success("Conta criada! Bons estudos.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6">
      <header className="text-center">
        <h1 className="font-display text-4xl font-black">
          {mode === "login" ? "Entrar no LEXY" : "Criar sua conta"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu vocabulário fica guardado na sua conta.
        </p>
      </header>

      {confirmSent ? (
        <div className="paper-card p-6 text-center">
          <p className="font-bold">Enviamos um e-mail de confirmação para {email}.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Clique no link da mensagem para ativar sua conta e voltar ao LEXY.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="paper-card flex flex-col gap-4 p-6">
          {mode === "signup" && (
            <label className="flex flex-col gap-1 text-sm font-bold">
              Seu nome
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 rounded-xl border-2 border-border bg-background px-3 text-base font-normal outline-none focus:border-ring"
                autoComplete="name"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-bold">
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-xl border-2 border-border bg-background px-3 text-base font-normal outline-none focus:border-ring"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Senha
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl border-2 border-border bg-background px-3 text-base font-normal outline-none focus:border-ring"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-xl bg-primary text-base font-black text-primary-foreground disabled:opacity-60"
          >
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <div className="flex items-center gap-3 text-xs font-bold uppercase text-muted-foreground">
            <span className="h-0.5 flex-1 bg-border" /> ou <span className="h-0.5 flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={busy}
            className="h-12 rounded-xl border-2 border-border bg-card text-base font-bold hover:bg-muted disabled:opacity-60"
          >
            Continuar com o Google
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => {
          setConfirmSent(false);
          setMode(mode === "login" ? "signup" : "login");
        }}
        className="text-sm font-bold underline"
      >
        {mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
      </button>
    </div>
  );
}

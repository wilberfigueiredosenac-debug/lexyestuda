import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/lexy-book-logo.png.asset.json";

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

const inputCls =
  "h-12 w-full rounded-xl border-2 border-border bg-background px-3 text-base font-normal outline-none transition focus:border-ring";

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signup" && password !== confirm) {
      toast.error("As senhas não são iguais.");
      return;
    }
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
      const msg = error instanceof Error ? error.message : "";
      toast.error(
        msg.includes("Invalid login") ? "E-mail ou senha incorretos." : msg || "Não foi possível continuar.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="content-enter mx-auto grid w-full max-w-5xl items-center gap-8 py-4 md:grid-cols-2 md:py-10">
      <section className="hidden flex-col items-center text-center md:flex">
        <img src={logo.url} alt="LEXY" className="h-56 w-auto object-contain lg:h-72" />
        <p className="mt-4 max-w-sm text-lg text-muted-foreground">
          Pesquise palavras, entenda seus sentidos e monte o seu caderno de vocabulário.
        </p>
      </section>

      <section className="mx-auto w-full max-w-md">
        <img src={logo.url} alt="LEXY" className="mx-auto mb-4 h-28 w-auto object-contain md:hidden" />
        <div className="paper-card p-5 sm:p-7">
          <div className="mb-6 grid grid-cols-2 rounded-full bg-muted p-1" role="tablist">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setConfirmSent(false);
                }}
                className={`rounded-full py-2 text-sm font-black transition ${
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <h1 className="font-display text-3xl font-black">
            {mode === "login" ? "Bem-vindo de volta" : "Comece a estudar"}
          </h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">Seu vocabulário fica guardado na sua conta.</p>

          {confirmSent ? (
            <div className="rounded-xl border-2 border-border bg-muted p-5 text-center">
              <p className="font-bold">Enviamos um e-mail de confirmação para {email}.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Clique no link da mensagem para ativar sua conta e voltar ao LEXY.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              {mode === "signup" && (
                <label className="flex flex-col gap-1 text-sm font-bold">
                  Seu nome
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="name" />
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm font-bold">
                E-mail
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Senha
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputCls} pr-12`}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>
              {mode === "signup" && (
                <label className="flex flex-col gap-1 text-sm font-bold">
                  Confirmar senha
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputCls}
                    autoComplete="new-password"
                  />
                </label>
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-black text-primary-foreground transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "Entrar" : "Criar conta"}
              </button>

              <div className="flex items-center gap-3 text-xs font-bold uppercase text-muted-foreground">
                <span className="h-0.5 flex-1 bg-border" /> ou <span className="h-0.5 flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={busy}
                className="h-12 rounded-xl border-2 border-border bg-card text-base font-bold transition hover:-translate-y-0.5 hover:bg-muted disabled:opacity-60"
              >
                Continuar com o Google
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const KEY = "lexy-cookie-notice";

export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(!localStorage.getItem(KEY));
    } catch {
      /* armazenamento indisponível */
    }
  }, []);
  if (!show) return null;
  function close() {
    try {
      localStorage.setItem(KEY, "ok");
    } catch {
      /* ignore */
    }
    setShow(false);
  }
  return (
    <div role="dialog" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-xl rounded-2xl border-2 border-border bg-card p-4 text-card-foreground shadow-lg lg:bottom-6">
      <p className="text-sm">
        O LEXY usa apenas armazenamento essencial para manter seu login e suas preferências. Não usamos rastreamento nem anúncios.{" "}
        <Link to="/cookies" className="font-bold underline">Saiba mais</Link>
      </p>
      <button onClick={close} className="mt-3 h-11 w-full rounded-xl bg-primary font-black text-primary-foreground sm:w-auto sm:px-6">
        Entendi
      </button>
    </div>
  );
}

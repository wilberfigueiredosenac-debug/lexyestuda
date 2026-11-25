import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => legalHead("Política de cookies", "O LEXY usa apenas armazenamento essencial para login e preferências. Sem rastreamento nem anúncios."),
  component: () => (
    <LegalPage title="Política de cookies">
      <p>O LEXY guarda poucas informações no seu navegador, e todas são essenciais para o app funcionar:</p>
      <ul>
        <li><strong>Sessão de login</strong> — mantém você conectado à sua conta.</li>
        <li><strong>Preferências</strong> — tema de cores, tamanho e tipo de letra.</li>
        <li><strong>Aviso de cookies</strong> — lembra que você já viu este aviso.</li>
      </ul>
      <h2>O que não usamos</h2>
      <p>Não usamos cookies de anúncios, de rastreamento entre sites nem ferramentas de análise de terceiros (como Google Analytics ou pixel do Facebook). Também não incorporamos vídeos ou redes sociais de terceiros.</p>
      <h2>Como apagar</h2>
      <p>Você pode apagar esses dados nas configurações do seu navegador. Ao apagar, você sairá da conta e as preferências voltam ao padrão.</p>
    </LegalPage>
  ),
});

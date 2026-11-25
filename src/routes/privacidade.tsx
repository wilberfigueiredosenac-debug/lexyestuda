import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/privacidade")({
  head: () => legalHead("Política de privacidade", "Saiba quais dados o LEXY coleta, por que coleta e como você pode pedir para apagá-los (LGPD)."),
  component: () => (
    <LegalPage title="Política de privacidade">
      <p>O LEXY é um projeto integrador escolar e gratuito de vocabulário de Língua Portuguesa. Esta política segue a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).</p>
      <h2>Quais dados coletamos</h2>
      <ul>
        <li>Conta: nome, e-mail e senha (a senha é guardada de forma criptografada; nem a equipe consegue lê-la). Se entrar com Google, recebemos nome, e-mail e foto.</li>
        <li>Uso do estudo: palavras pesquisadas e salvas, anotações, favoritos, respostas de exercícios, tempo de estudo, metas e sequência de dias.</li>
        <li>Textos que você envia para correção (frases e redações).</li>
      </ul>
      <p>Coletamos só o necessário para o app funcionar. Não pedimos CPF, endereço, telefone ou dados sensíveis.</p>
      <h2>Para que usamos</h2>
      <ul>
        <li>Manter sua conta e o seu caderno de vocabulário.</li>
        <li>Criar perguntas, correções e estatísticas do seu estudo.</li>
        <li>Garantir a segurança da conta.</li>
      </ul>
      <p>Não vendemos, não alugamos e não usamos seus dados para publicidade.</p>
      <h2>Inteligência artificial</h2>
      <p>Palavras e textos que você envia são processados por modelos de IA (como OpenAI e Google Gemini) apenas para gerar a resposta, sem seu nome ou e-mail. Não envie dados pessoais nos textos.</p>
      <h2>Quem acessa</h2>
      <p>Cada aluno só vê os próprios dados — o banco de dados bloqueia o acesso de outras contas. Os dados ficam em servidores do Lovable Cloud.</p>
      <h2>Menores de idade</h2>
      <p>O LEXY é voltado a estudantes. Menores de 18 anos devem usar o app com conhecimento dos pais ou responsáveis.</p>
      <h2>Seus direitos</h2>
      <p>Você pode ver, corrigir ou apagar seus dados a qualquer momento: as palavras e anotações podem ser excluídas no próprio app, e para apagar a conta inteira basta pedir à equipe do projeto pelo contato abaixo.</p>
      <h2>Cookies</h2>
      <p>Veja a <Link to="/cookies" className="font-bold underline">Política de cookies</Link>.</p>
      <h2>Contato</h2>
      <p>Equipe do projeto LEXY — envie sua solicitação para o professor responsável ou para a equipe pelo e-mail da sua conta escolar.</p>
    </LegalPage>
  ),
});

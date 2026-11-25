import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/termos")({
  head: () => legalHead("Termos de uso", "Regras para usar o LEXY: conta, conteúdo gerado por IA, limites e responsabilidades."),
  component: () => (
    <LegalPage title="Termos de uso">
      <p>Ao criar uma conta ou usar o LEXY, você concorda com estes termos e com a <Link to="/privacidade" className="font-bold underline">Política de privacidade</Link>.</p>
      <h2>O serviço</h2>
      <p>O LEXY é um projeto integrador escolar, gratuito e sem fins lucrativos, para estudar vocabulário de Língua Portuguesa. Não há cobrança, assinatura ou compra dentro do app; por isso não há política de reembolso.</p>
      <h2>Sua conta</h2>
      <ul>
        <li>Use dados verdadeiros e mantenha sua senha em segredo.</li>
        <li>A conta é pessoal; você responde pelo que for feito nela.</li>
      </ul>
      <h2>Uso adequado</h2>
      <ul>
        <li>Não envie conteúdo ofensivo, ilegal ou dados pessoais de outras pessoas.</li>
        <li>Não tente acessar dados de outros alunos nem sobrecarregar o sistema.</li>
      </ul>
      <h2>Conteúdo gerado por IA</h2>
      <p>Significados, exemplos, perguntas e correções são criados por inteligência artificial e podem conter erros. Use como apoio ao estudo, não como fonte oficial; em caso de dúvida, consulte um dicionário ou seu professor.</p>
      <h2>Disponibilidade</h2>
      <p>Por ser um projeto escolar, o app pode ficar fora do ar, mudar funções ou ter limites de uso da IA sem aviso prévio.</p>
      <h2>Imagens e marca</h2>
      <p>A logo e as artes do LEXY foram criadas pela equipe do projeto. Os ícones usados são de bibliotecas de código aberto (Lucide).</p>
      <h2>Leis aplicáveis</h2>
      <p>Estes termos seguem as leis brasileiras, incluindo o Marco Civil da Internet, a LGPD e o Código de Defesa do Consumidor.</p>
    </LegalPage>
  ),
});

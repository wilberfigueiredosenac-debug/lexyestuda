# LEXY — Plataforma de vocabulário

App para estudantes pesquisarem palavras com ajuda de IA, salvarem em um vocabulário pessoal e revisarem depois. Visual estudantil vibrante (azul-noite, amarelo, verde, fundo creme), com cara de caderno digital.

## Telas

1. **Início (pública)** — logo LEXY, "Seu vocabulário, do seu jeito.", barra de pesquisa grande e botão Pesquisar. Quem já entrou vê as palavras pesquisadas recentemente.
2. **Entrar / Criar conta** — e-mail e senha, além de entrar com Google. Nome do aluno no cadastro.
3. **Resultado da palavra** — palavra em destaque, classe gramatical, significado principal, outros significados, exemplos de frases, sinônimos, antônimos, explicação de polissemia e de contexto, e nota sobre variação linguística/regionalismo quando existir. Botão "+ Adicionar ao meu vocabulário".
4. **Meu vocabulário** — lista das palavras salvas, busca e filtro por favoritas, ordenação por data. Ao abrir uma palavra: todas as informações, campo de anotação pessoal, botão de favoritar e de excluir (com confirmação).
5. **Revisão** — a IA cria perguntas a partir das palavras salvas; o aluno responde, recebe correção e o resultado fica registrado, com um resumo de acertos.
6. **Perfil** — nome, e-mail, total de palavras salvas, favoritas e desempenho nas revisões; sair da conta.

Menu fixo: INÍCIO | VOCABULÁRIO | REVISÃO | PERFIL.

## Funcionamento da pesquisa

A palavra digitada é enviada ao servidor do próprio app, que consulta a IA Gemini com instruções fixas para devolver sempre o mesmo formato de informações. O aluno nunca sai do LEXY e a chave da IA fica protegida no servidor. Se a IA falhar ou a palavra não existir, aparece uma mensagem clara com opção de tentar de novo.

## Dados guardados

- Perfil do aluno (nome, e-mail).
- Palavras analisadas (reaproveitadas entre alunos para respostas instantâneas e menos custo).
- Vocabulário pessoal: palavra, data em que salvou, anotação, favorito.
- Histórico de pesquisas.
- Revisões: pergunta, resposta dada e resultado.

Cada aluno só enxerga e altera os próprios dados.

## Cobertura dos requisitos

RF01–RF15 atendidos. RNFs tratados com: layout que se adapta a celular, tablet e computador; textos grandes e legíveis; mensagens de erro claras; linguagem simples nas explicações da IA; dados protegidos por conta.

## Detalhes técnicos

- Lovable Cloud para banco de dados e login (e-mail/senha + Google), com RLS por usuário.
- Tabelas: `profiles`, `words` (cache global de análises), `vocabulary`, `search_history`, `reviews`.
- Server functions do TanStack Start chamam o Gemini via Lovable AI Gateway com resposta em JSON estruturado (schema fixo); nenhuma chave no navegador.
- Rotas: `/` (pública), `/auth`, `/palavra/$termo`, `/_authenticated/vocabulario`, `/_authenticated/revisao`, `/_authenticated/perfil`.
- Design tokens em `src/styles.css`; sem cores fixas nos componentes.

## Fora desta versão

Pesquisa por voz, palavra do dia, pontuação/gamificação, análise de textos inteiros e estatísticas avançadas.

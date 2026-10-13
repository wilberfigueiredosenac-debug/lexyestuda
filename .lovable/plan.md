# Lembretes por e-mail e reforço de segurança

## 1. Lembrete diário por e-mail
- Pré-requisito: configurar um domínio de envio próprio (ex.: avisos@seudominio.com). Sem domínio próprio não é possível enviar.
- No Perfil, em "Meta diária e lembrete": nova opção "Receber lembrete por e-mail" (além do aviso no topo, que continua).
- Uma verificação automática roda de hora em hora: para cada aluno com lembrete por e-mail ligado, se já passou do horário escolhido e a meta de hoje não foi cumprida, envia um único e-mail no dia: "Faltam N atividades para sua meta de hoje" com botão "Estudar agora" e a sequência atual.
- No máximo um e-mail por dia por aluno; nada é enviado se a meta já foi cumprida. Link de descadastro incluído automaticamente.
- Horário respeita o fuso do aluno (salvo junto com a meta).

## 2. Segurança
- Rodar a varredura de segurança do projeto e corrigir tudo que aparecer (permissões das tabelas, funções do banco, rotas públicas).
- Rota de pronúncia: exigir login e limitar tamanho do texto, para ninguém usar a IA de fora do app.
- Rota do lembrete automático: só aceita chamadas com a chave secreta interna.
- Ativar verificação de senhas vazadas no cadastro.
- Validação de todas as entradas enviadas ao servidor e mensagens de erro sem detalhes internos.

## Detalhes técnicos
- Migração: `study_goals` ganha `email_reminder boolean default false`, `timezone text default 'America/Cuiaba'`, `last_email_sent_on date`.
- Scaffold de e-mails de app + template `daily-goal-reminder` (cores do LEXY).
- Rota `src/routes/api/public/cron/goal-reminders.ts` protegida por `authenticateCronRequest`; usa cliente admin, calcula hora local por timezone, envia via `sendTemplateEmail` com idempotencyKey `goal-reminder-{user}-{dia}`, grava `last_email_sent_on`.
- Agendamento HTTP de hora em hora (minuto 17) — 24 execuções/dia, custo baixo.
- `/api/pronuncia`: checar bearer token do usuário e limitar texto a 60 caracteres.
- `supabase--configure_auth` com `password_hibp_enabled`.

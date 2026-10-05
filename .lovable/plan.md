# Logo LEXY ocupando o header, com a perna do "y" saindo para fora

## O que mudar

Somente `src/components/AppShell.tsx` (o logo já é a imagem enviada pelo usuário, importada de `src/assets/lexy-logo.png.asset.json`).

1. **Header mais compacto na altura interna**: reduzir o padding vertical do cabeçalho (`py-3` → `py-1.5`) para a imagem dominar o espaço do header.
2. **Logo maior**: a imagem passa de `h-12` para `h-20` (mobile) / `h-24` em telas maiores (`h-20 sm:h-24`), ocupando praticamente toda a altura do header.
3. **Perna do "y" fora do header**: a imagem recebe margem inferior negativa (ex.: `-mb-5` proporcional ao tamanho) para o rabicho do "y" descer além da borda inferior do header, sobrepondo o conteúdo da página.
4. **z-index maior**: envolver o logo num contêiner `relative z-30` (acima do `z-20` do header e de qualquer conteúdo) e garantir que nada no header recorte a imagem (sem `overflow-hidden`).

## Verificação

- Build e typecheck (`bunx tsgo --noEmit`).
- Playwright: screenshot do topo da página em desktop e mobile confirmando que o logo é grande, o rabicho do "y" aparece fora do header e nada fica clicável por cima do logo (link de início continua funcionando).

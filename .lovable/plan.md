# Personalização e renovação visual do LEXY

## Resultado

Deixar o LEXY mais moderno e ágil, ampliar a logo, usar a mesma identidade visual no nome da página inicial, oferecer temas de cor e adicionar uma calculadora de meta de estudo.

## Mudanças

1. **Logo e identidade**
   - Aumentar um pouco a logo do cabeçalho, preservando a perna do “y” fora da borda e acima do conteúdo.
   - Substituir o “LEXY” preto da página inicial pela mesma logo ilustrada do cabeçalho, em tamanho equilibrado para celular e computador.
   - Garantir que a logo, o botão de conta e o início do conteúdo não se sobreponham.

2. **Personalização de cores**
   - Criar os temas **Claro**, **Escuro**, **Roxo** e **Original**.
   - Alterar somente as cores da página; textos, recursos e organização permanecem iguais.
   - Adicionar um atalho de aparência no cabeçalho e a configuração completa no Perfil.
   - Salvar a escolha no aparelho e restaurá-la automaticamente nas próximas visitas, inclusive antes da página aparecer para evitar troca brusca de cor.

3. **Visual e interações**
   - Refinar hierarquia, espaçamento, contraste e estados de foco em todas as áreas compartilhadas.
   - Transformar os principais atalhos e cartões em elementos interativos com elevação discreta, feedback ao toque e transições curtas.
   - Animar abertura do seletor, progresso e entrada de conteúdo sem prejudicar leitura; respeitar a preferência por movimento reduzido.
   - Manter as animações leves e próprias para celular.

4. **Calculadora de meta de estudo**
   - Adicionar ao Perfil uma calculadora interativa de meta.
   - O aluno informa a quantidade total de palavras, o prazo em dias e, opcionalmente, quantos dias por semana pretende estudar.
   - Mostrar imediatamente quantas palavras estudar por dia e por semana, sempre arredondando para uma meta alcançável.
   - Oferecer “Usar como meta diária”, preenchendo a meta existente; a gravação continua acontecendo pelo botão de salvar já disponível.

5. **Velocidade percebida**
   - Reduzir renderizações e consultas repetidas nos elementos compartilhados.
   - Carregar o seletor de aparência e efeitos sem bibliotecas pesadas.
   - Manter imagens com dimensões estáveis para evitar saltos na tela e preservar o cache já usado pelo app.

## Detalhes técnicos

- Centralizar os temas em atributos no elemento raiz e em tokens semânticos de `src/styles.css`, mantendo compatibilidade com todas as telas existentes.
- Criar componentes pequenos e reutilizáveis para seletor de tema e calculadora, usando os controles visuais já adotados pelo projeto.
- Registrar a escolha de tema no armazenamento local, sem mudanças no banco de dados.
- Não alterar pesquisa, exercícios, metas, estatísticas ou regras de negócio existentes, exceto o preenchimento opcional da meta pela calculadora.

## Verificação

- Conferir os quatro temas no início e no perfil, incluindo recarregamento da página.
- Conferir logo, menu, cartões, seletor e calculadora em celular e computador.
- Testar o cálculo e a ação “Usar como meta diária”.
- Validar contraste, teclado, movimento reduzido, ausência de sobreposição e carregamento sem erros.
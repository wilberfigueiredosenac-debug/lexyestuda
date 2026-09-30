# Melhorias: exercícios, tema, metas, tempo de estudo e estatísticas

## 1. Prompt do gerador de exercícios melhorado
- Tipos de pergunta distribuídos sem repetir o mesmo tipo seguido: significado, sinônimo, antônimo, sentido no contexto, completar a frase, polissemia, "qual frase usa a palavra corretamente", intruso (palavra que não combina).
- Alternativas erradas plausíveis (mesma classe gramatical e tamanho parecido), nada de alternativas absurdas ou "todas as anteriores"; a posição da resposta certa varia.
- Frases para escrever: o pedido exige mostrar o sentido (ex.: "escreva uma frase em que fique claro que 'efêmero' é algo que dura pouco"), com uma situação concreta; a correção reprova frases em que a palavra aparece mas o sentido não fica claro.
- O servidor embaralha as alternativas e remove perguntas repetidas antes de devolver.

## 2. Nova tela "Exercícios por tema" (/tema)
- Grade de temas prontos (meio ambiente, tecnologia, esportes, saúde, cidadania, ciência, arte, alimentação) + campo para digitar um tema próprio.
- Nível (Fundamental/Médio) e quantidade; a IA escolhe o vocabulário do tema, gera perguntas de múltipla escolha e 2–3 frases para escrever (com correção pela IA).
- No final, lista das palavras do tema com botão "Salvar no vocabulário".
- Link na tela de Exercícios e em Revisão (a barra inferior não ganha item novo, para não lotar).

## 3. Painel de metas
- No Perfil e no Estudo diário: "Faltam N atividades para a meta de hoje" (ou "Meta de hoje cumprida!").
- Ao completar a meta: aviso de parabéns, sequência atualizada na hora, e o Estudo diário passa automaticamente para a próxima palavra após cada resposta; ao terminar todas, mostra o resumo do dia.

## 4. Tempo no estudo diário
- Cronômetro por palavra (do momento que a pergunta aparece até a resposta), mostrado em cada card respondido.
- Topo da tela: tempo total de hoje e média por palavra.
- Tempo salvo com cada resposta.

## 5. Estatísticas no Perfil
- Palavras revisadas (total e últimos 7 dias).
- Gráfico de barras dos últimos 7 dias: acertos x erros por dia.
- Tempo gasto no estudo diário por dia (últimos 7 dias) e média por palavra.

## Detalhes técnicos
- Migração: `reviews` ganha `duration_ms integer` (nulo para respostas antigas) e `source text` ('estudo' | 'revisao' | 'exercicios' | 'tema'); índice (user_id, created_at).
- `lexy.functions.ts`: reescrever system prompt de `generateCustomExercises` e `checkSentence`; nova opção `mode: "tema"` que também retorna `words: string[]`; embaralhar opções e recalcular `correctIndex` no servidor.
- Nova rota `src/routes/_authenticated/tema.tsx`, reutilizando o fluxo de quiz/frases extraído de `exercicios.tsx` para um componente compartilhado.
- `estudo.tsx`: modo um-card-por-vez com timer (`performance.now()`), grava `duration_ms` e `source: 'estudo'`; toast ao atingir a meta.
- Perfil: consulta `reviews` dos últimos 7 dias agregando no cliente; gráfico com barras em CSS (sem biblioteca nova).

# Patinhas do Gustavo

Quebra-cabeça de pintar letras com um filhote de golden retriever, **sem propagandas, sem compras e sem coleta de dados**.
Cada fase é uma letra feita de blocos de pedra: o filhote pula de bloco em bloco, cada bloco pisado vira grama florida com uma patinha, e quando a letra inteira está pintada a casinha abre.

**Jogar:** https://micheltlutz.github.io/patinhas-do-gustavo/

## Instalar no iPad

1. Abra o link acima no **Safari**.
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início**.
3. Abra o jogo pelo ícone **uma vez com internet**. Depois disso ele funciona offline.

## Como se joga

- **Mover:** tocar num bloco vizinho (ou deslizar o dedo) faz o filhote pular. Tocar num bloco longe faz ele ir andando até lá sozinho.
- **Pintar:** pise em todos os blocos da letra. A barra lá em cima enche de verde.
- **Casinha:** com a letra toda pintada, a porta abre e uma setinha mostra o caminho.
- **Ossinhos dourados:** 3 em cada letra (78 no total), para trocar por roupinhas.
- **Água + caixote:** empurre o caixote para dentro da água e ele vira ponte. O caixote só anda para dentro da água, então nunca dá para travar.
- **Botão de osso:** pisou, ele levanta pontes escondidas e abre portões.
- **Mola:** joga o filhote 3 blocos para a frente, por cima de 2.
- **Sem castigo:** caiu na água? O filhote sacode o pelo e volta. Portão fechado ou caixote que não mexe só balançam. Não tem vidas, tempo nem "game over".
- **Dica:** a lâmpada mostra patinhas douradas no caminho (e uma seta no caixote). Ela aparece sozinha depois de 25 segundos parado.
- **Voz:** "Vamos pintar a letra Bê!" no começo, o nome da letra no meio e "Bê de Biscoito!" no fim, com a figura da palavra.

**Mapa:** as 26 letras, todas liberadas. As letras do nome (G-U-S-T-A-V-O) são douradas e vêm primeiro na sugestão; elas também apresentam as novidades aos poucos (S: caixote, T: botão, A: portão, V: molas, O: casinha no meio da letra).

**Roupinhas (loja, sem dinheiro de verdade):** lenço (3 ossinhos), chapéu de festa (6), gravata borboleta (10), óculos de sol (15), capa de herói (20) e juba de leão (24). Tocar numa roupinha comprada veste ou tira.

## Desenvolvimento

Requer Node 24 ou mais novo.

```sh
npm install
npm run dev -- --host   # abre na rede local (teste no iPad pela Wi-Fi)
npm test                # regras e todas as fases (nunca travam; a dica resolve)
npm run build           # versão final em dist/
npm run icons           # gera os ícones PNG a partir de public/icon.svg
```

Estrutura:
- `src/game/levels.ts`: as 26 fases, desenhadas como texto (legenda em `src/game/board.ts`).
- `src/game/rules.ts`: regras (pular, pintar, caixote, botão, mola, casinha), andar sozinho e dica. Código puro, testado.
- `src/ui/boardView.ts`: o tabuleiro em 2.5D, toque e animações.
- `src/ui/dog.ts`: o filhote e as roupinhas (SVG).
- `src/ui/screens.ts`: telas inicial, mapa, fase e loja.
- `src/audio/sfx.ts`: sons sintetizados e a voz.

Os testes conferem, em cada fase, que **de qualquer situação** ainda dá para pintar a letra inteira e entrar na casinha, e que um jogador que só segue a dica termina a fase.

Cada push na branch `main` roda os testes e publica no GitHub Pages.

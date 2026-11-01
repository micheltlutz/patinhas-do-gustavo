// Fases desenhadas como texto, uma linha por fileira de blocos.
//
//   #  bloco da letra (pedra; vira grama florida ao ser pisado)
//   *  bloco da letra com ossinho dourado
//   .  chão de ajuda (não precisa pintar)
//   +  chão de ajuda com ossinho
//   S  onde o filhote começa (chão de ajuda)
//   H  casinha (só abre quando a letra inteira estiver pintada)
//   w  água no meio da letra (com um caixote vira bloco da letra)
//   ~  água fora da letra
//   x  caixote em chão de ajuda      X  caixote em bloco da letra
//   p  botão de osso (pisou, ficou apertado)
//   g  portão na letra (abre com o botão)
//   r  bloco da letra escondido (sobe com o botão)
//   R  chão de ajuda escondido (sobe com o botão)
//   j  mola (joga o filhote 3 blocos para a frente, por cima de 2)
//   espaço: nada (céu)

export type Kind =
  | 'void'
  | 'letter'
  | 'ground'
  | 'water'
  | 'waterLetter'
  | 'hidden'
  | 'hiddenLetter'
  | 'gate'
  | 'button'
  | 'spring'
  | 'house';

export interface Board {
  readonly cols: number;
  readonly rows: number;
  /** Tipo de cada bloco (índice = fileira * cols + coluna). */
  readonly kinds: readonly Kind[];
  readonly start: number;
  readonly house: number;
  /** Onde estão os caixotes no começo. */
  readonly boxes: readonly number[];
  /** Blocos com ossinho. */
  readonly bones: readonly number[];
}

const KIND_OF: Record<string, Kind> = {
  ' ': 'void',
  '#': 'letter',
  '*': 'letter',
  X: 'letter',
  '.': 'ground',
  '+': 'ground',
  S: 'ground',
  x: 'ground',
  H: 'house',
  w: 'waterLetter',
  '~': 'water',
  p: 'button',
  g: 'gate',
  r: 'hiddenLetter',
  R: 'hidden',
  j: 'spring',
};

/** Blocos que fazem parte da letra (precisam ser pintados). */
export function isLetterKind(k: Kind): boolean {
  return k === 'letter' || k === 'waterLetter' || k === 'hiddenLetter' || k === 'gate';
}

export function isWater(k: Kind): boolean {
  return k === 'water' || k === 'waterLetter';
}

export function isHidden(k: Kind): boolean {
  return k === 'hidden' || k === 'hiddenLetter';
}

/** Lê o desenho de uma fase. Tira linhas e colunas vazias das bordas. */
export function parseBoard(lines: readonly string[]): Board {
  let rowsText = lines.map((l) => l.replace(/\s+$/, ''));
  while (rowsText.length && rowsText[0].trim() === '') rowsText = rowsText.slice(1);
  while (rowsText.length && rowsText[rowsText.length - 1].trim() === '') rowsText = rowsText.slice(0, -1);
  const indent = Math.min(...rowsText.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  rowsText = rowsText.map((l) => l.slice(indent));
  const cols = Math.max(...rowsText.map((l) => l.length));
  const rows = rowsText.length;
  const kinds: Kind[] = [];
  const boxes: number[] = [];
  const bones: number[] = [];
  let start = -1;
  let house = -1;
  rowsText.forEach((line, r) => {
    for (let c = 0; c < cols; c++) {
      const ch = line[c] ?? ' ';
      const kind = KIND_OF[ch];
      if (!kind) throw new Error(`caractere desconhecido "${ch}" na fileira ${r + 1}`);
      const i = r * cols + c;
      kinds.push(kind);
      if (ch === 'x' || ch === 'X') boxes.push(i);
      if (ch === '*' || ch === '+') bones.push(i);
      if (ch === 'S') {
        if (start >= 0) throw new Error('mais de um começo (S)');
        start = i;
      }
      if (ch === 'H') {
        if (house >= 0) throw new Error('mais de uma casinha (H)');
        house = i;
      }
    }
  });
  if (start < 0) throw new Error('fase sem começo (S)');
  if (house < 0) throw new Error('fase sem casinha (H)');
  return { cols, rows, kinds, start, house, boxes, bones };
}

/** Blocos que precisam ser pintados. */
export function requiredOf(board: Board): number[] {
  return board.kinds.flatMap((k, i) => (isLetterKind(k) ? [i] : []));
}

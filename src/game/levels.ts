// As 26 fases: uma letra em blocos, com ossinhos e, em algumas, água e
// caixote, botão com portão ou ponte, e molas. Legenda em board.ts.

import { parseBoard, type Board } from './board.ts';

export interface Level {
  readonly letter: string;
  /** Como se fala o nome da letra. */
  readonly say: string;
  /** Palavra do fim da fase ("B de Biscoito") e a figura dela. */
  readonly word: string;
  readonly emoji: string;
  readonly board: Board;
}

interface Raw {
  say: string;
  word: string;
  emoji: string;
  map: string[];
}

const RAW: Record<string, Raw> = {
  // Portão: o botão em cima abre o meio do A.
  A: {
    say: 'A',
    word: 'Abelha',
    emoji: '🐝',
    map: [
      '    p    ',
      '  ##*##  ',
      '  #   #  ',
      '  *   #  ',
      '  ##g##  ',
      '  #   *  ',
      '  #   #  ',
      '  #   #  ',
      '  S   H  ',
    ],
  },
  // Água e caixote: empurrar o caixote para tapar o buraco.
  B: {
    say: 'Bê',
    word: 'Biscoito',
    emoji: '🍪',
    map: [
      ' S####   ',
      '  #  ##  ',
      '  *###   ',
      '  #  ##+.',
      '  #   wx.',
      '  #  *#  ',
      '  ####   ',
      '  H      ',
    ],
  },
  C: {
    say: 'Cê',
    word: 'Casa',
    emoji: '🏠',
    map: [
      '  ##*##S ',
      '  #      ',
      '  #      ',
      '  *      ',
      '  #      ',
      '  #      ',
      '  ###*#H ',
    ],
  },
  D: {
    say: 'Dê',
    word: 'Dado',
    emoji: '🎲',
    map: [
      ' S####   ',
      '  #  ##  ',
      '  *   #.+',
      '  #   wx.',
      '  #   #  ',
      '  #  *#  ',
      '  ####   ',
      '   H     ',
    ],
  },
  E: {
    say: 'É',
    word: 'Elefante',
    emoji: '🐘',
    map: [
      '  ##*##S ',
      '  #      ',
      '  #      ',
      '  ##*#   ',
      '  #      ',
      '  *      ',
      '  #####H ',
    ],
  },
  // Ponte: o botão no fim do traço do meio levanta o resto da perna.
  F: {
    say: 'Éfe',
    word: 'Foca',
    emoji: '🦭',
    map: [
      '  ##*##S ',
      '  #      ',
      '  *      ',
      '  ###*p  ',
      '  r      ',
      '  r      ',
      '  #      ',
      '  H      ',
    ],
  },
  G: {
    say: 'Gê',
    word: 'Gato',
    emoji: '🐱',
    map: [
      '  ####*  ',
      '  #      ',
      '  #      ',
      'S.#  ##H ',
      '  #   #  ',
      '  #   *  ',
      '  *####  ',
    ],
  },
  // Ponte no traço do meio.
  H: {
    say: 'Agá',
    word: 'Hipopótamo',
    emoji: '🦛',
    map: [
      '  p      ',
      '  #   #  ',
      '  *   #  ',
      '  #   *  ',
      '  #rrr#  ',
      '  #   #  ',
      '  #   #  ',
      '  #   *  ',
      '  S   H  ',
    ],
  },
  I: {
    say: 'I',
    word: 'Ilha',
    emoji: '🏝️',
    map: [
      '  S#*#   ',
      '    #    ',
      '    #    ',
      '    *    ',
      '    #    ',
      '    #    ',
      '   #*#H  ',
    ],
  },
  // Caixote em cima da letra: empurrar para baixo, para dentro da água.
  J: {
    say: 'Jota',
    word: 'Jacaré',
    emoji: '🐊',
    map: [
      '   S#*#  ',
      '     #   ',
      '     X   ',
      '     w   ',
      '  H  #   ',
      '  #  *   ',
      '  ##*#   ',
    ],
  },
  // Portão no meio do K.
  K: {
    say: 'Cá',
    word: 'Kiwi',
    emoji: '🥝',
    map: [
      '  p      ',
      '  #   *  ',
      '  #  ##  ',
      '  * ##   ',
      '  #g#    ',
      '  # ##   ',
      '  #  #*  ',
      '  #   #  ',
      '  S   H  ',
    ],
  },
  L: {
    say: 'Éle',
    word: 'Leão',
    emoji: '🦁',
    map: [
      '  S      ',
      '  #      ',
      '  #      ',
      '  *      ',
      '  #      ',
      '  #      ',
      '  *      ',
      '  ##*##H ',
    ],
  },
  M: {
    say: 'Ême',
    word: 'Macaco',
    emoji: '🐒',
    map: [
      ' ##   ## ',
      ' *## ### ',
      ' # #*# # ',
      ' #  #  # ',
      ' #     X ',
      ' #     w ',
      ' *     # ',
      ' S     H ',
    ],
  },
  // Ponte escondida no meio da diagonal.
  N: {
    say: 'Êne',
    word: 'Navio',
    emoji: '🚢',
    map: [
      ' p    H  ',
      ' *#   #  ',
      ' ###  #  ',
      ' # r# #  ',
      ' #  ###  ',
      ' #   *#  ',
      ' #    #  ',
      ' *    #  ',
      ' S       ',
    ],
  },
  // A casinha fica no meio do O: a mola só funciona com a letra pronta.
  O: {
    say: 'Ó',
    word: 'Ovo',
    emoji: '🥚',
    map: [
      '    S    ',
      '  ##*##  ',
      '  # j #  ',
      '  #   *  ',
      '  *   #  ',
      '  # H #  ',
      '  #   #  ',
      '  #####  ',
    ],
  },
  P: {
    say: 'Pê',
    word: 'Pato',
    emoji: '🦆',
    map: [
      '     +.  ',
      '  ####X  ',
      '  #   w  ',
      '  *   #  ',
      '  #####H ',
      '  #      ',
      '  *      ',
      '  #      ',
      '  S      ',
    ],
  },
  Q: {
    say: 'Quê',
    word: 'Queijo',
    emoji: '🧀',
    map: [
      '  S      ',
      '  ##*##  ',
      '  #   #  ',
      '  *   #  ',
      '  #   #  ',
      '  # # #  ',
      '  # g*#  ',
      '  ###### ',
      '  H    p ',
    ],
  },
  R: {
    say: 'Érre',
    word: 'Rato',
    emoji: '🐭',
    map: [
      '      p  ',
      '  ##*##  ',
      '  #   #  ',
      '  *   #  ',
      '  #####  ',
      '  # g#   ',
      '  #  #*  ',
      '  #   #  ',
      '  S   H  ',
    ],
  },
  // Primeira água: empurrar o caixote para baixo.
  S: {
    say: 'Ésse',
    word: 'Sapo',
    emoji: '🐸',
    map: [
      '  #####S ',
      '  * +    ',
      '  # x    ',
      '  ##w##  ',
      '      #  ',
      '      #  ',
      ' H##*##  ',
    ],
  },
  // Primeiro botão: ele levanta a ponte do meio do T.
  T: {
    say: 'Tê',
    word: 'Tartaruga',
    emoji: '🐢',
    map: [
      ' S####*p ',
      '    #    ',
      '    *    ',
      '    r    ',
      '    r    ',
      '    #    ',
      '    *    ',
      '    H    ',
    ],
  },
  U: {
    say: 'U',
    word: 'Uva',
    emoji: '🍇',
    map: [
      '  S   H  ',
      '  #   #  ',
      '  *   #  ',
      '  #   #  ',
      '  #   *  ',
      '  #   #  ',
      '  #   #  ',
      '  ##*##  ',
    ],
  },
  // Molas: pular até a ilhinha da casinha, no meio do V.
  V: {
    say: 'Vê',
    word: 'Vaca',
    emoji: '🐄',
    map: [
      ' S       ',
      ' #   H # ',
      ' #j j+ # ',
      ' ##   ## ',
      '  *   #  ',
      '  ## ##  ',
      '   # #   ',
      '   #*#   ',
    ],
  },
  W: {
    say: 'Dáblio',
    word: 'Waffle',
    emoji: '🧇',
    map: [
      ' S     H ',
      ' #     # ',
      ' *     # ',
      ' #     # ',
      ' #  *  # ',
      ' # ### # ',
      ' ### ##* ',
      ' ##   ## ',
    ],
  },
  X: {
    say: 'Xis',
    word: 'Xícara',
    emoji: '☕',
    map: [
      '  p   S  ',
      '  #   #  ',
      '  *# ##  ',
      '   #*#   ',
      '    g    ',
      '   ###   ',
      '  ## #*  ',
      '  #   #  ',
      '  H      ',
    ],
  },
  Y: {
    say: 'Ípsilon',
    word: 'Yoga',
    emoji: '🧘',
    map: [
      '  S   p  ',
      '  #   *  ',
      '  *# ##  ',
      '   ###   ',
      '    #    ',
      '    r    ',
      '    r    ',
      '    *    ',
      '    H    ',
    ],
  },
  Z: {
    say: 'Zê',
    word: 'Zebra',
    emoji: '🦓',
    map: [
      ' S#####  ',
      '     ##  ',
      '    *#   ',
      '   ##    ',
      '  ##.    ',
      '  * x    ',
      '  ##w#*H ',
    ],
  },
};

export const LEVELS: readonly Level[] = Object.entries(RAW).map(([letter, r]) => ({
  letter,
  say: r.say,
  word: r.word,
  emoji: r.emoji,
  board: parseBoard(r.map),
}));

/** Ordem sugerida: primeiro as letras do nome dele, depois o resto do alfabeto. */
export const NAME = 'GUSTAVO';
export const SUGGESTED: readonly number[] = (() => {
  const order = [...new Set([...NAME, ...LEVELS.map((l) => l.letter)])];
  return order.map((c) => LEVELS.findIndex((l) => l.letter === c));
})();

export function levelIndexOf(letter: string): number {
  return LEVELS.findIndex((l) => l.letter === letter);
}

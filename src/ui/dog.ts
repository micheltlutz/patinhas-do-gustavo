// O filhote de golden retriever (SVG) e as roupinhas da loja.
// Desenho de frente, sentado; as patinhas ficam embaixo, no meio (60, 116).

export interface Item {
  readonly id: string;
  readonly name: string;
  /** Preço em ossinhos. */
  readonly price: number;
}

/** Roupinhas, da mais barata à mais cara (somam 78 = todos os ossinhos do jogo). */
export const ITEMS: readonly Item[] = [
  { id: 'bandana', name: 'Lenço', price: 3 },
  { id: 'hat', name: 'Chapéu de festa', price: 6 },
  { id: 'bow', name: 'Gravata borboleta', price: 10 },
  { id: 'glasses', name: 'Óculos de sol', price: 15 },
  { id: 'cape', name: 'Capa de herói', price: 20 },
  { id: 'mane', name: 'Juba de leão', price: 24 },
];

const FUR = '#F0B44C';
const FUR_DARK = '#C98A2B';
const FUR_LIGHT = '#F8CF78';
const CREAM = '#FCE6BA';
const INK = '#3E2723';

function star(cx: number, cy: number, points: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Desenho de cada roupinha (no mesmo espaço do filhote). */
export const ITEM_ART: Record<string, { back?: string; front?: string }> = {
  cape: {
    back: `<path d="M36 64 Q60 56 84 64 L98 114 Q60 122 22 114 Z" fill="#E53935" stroke="#B71C1C" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M52 92 l3.5 7 7.7 1 -5.6 5.3 1.4 7.6 -7-3.7 -7 3.7 1.4-7.6 -5.6-5.3 7.7-1z" fill="#FFEB3B" opacity=".9"/>`,
  },
  mane: {
    back: `<polygon points="${star(60, 45, 14, 44, 33)}" fill="#E65100" stroke="#BF360C" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="60" cy="45" r="33" fill="#F57C00"/>`,
  },
  bandana: {
    front: `<path d="M38 66 Q60 72 82 66 L60 88 Z" fill="#E53935" stroke="#B71C1C" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="55" cy="73" r="1.8" fill="#fff"/><circle cx="66" cy="73" r="1.8" fill="#fff"/><circle cx="60" cy="80" r="1.8" fill="#fff"/>`,
  },
  bow: {
    front: `<path d="M60 70 L45 62 Q42 70 45 78 Z M60 70 L75 62 Q78 70 75 78 Z" fill="#1E88E5" stroke="#0D47A1" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="60" cy="70" r="4.5" fill="#42A5F5" stroke="#0D47A1" stroke-width="2"/>`,
  },
  glasses: {
    front: `<path d="M37 37 H56 Q57 49 47 49 Q37 49 37 37 Z M64 37 H83 Q83 49 73 49 Q63 49 64 37 Z" fill="#212121" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M56 39 Q60 36 64 39" fill="none" stroke="#000" stroke-width="2.5"/>
      <path d="M40 40 l5 0 M67 40 l5 0" stroke="#90CAF9" stroke-width="2" stroke-linecap="round"/>`,
  },
  hat: {
    front: `<g transform="rotate(12 62 20)">
        <path d="M47 24 L62 -6 L77 24 Q62 29 47 24 Z" fill="#AB47BC" stroke="#6A1B9A" stroke-width="2" stroke-linejoin="round"/>
        <path d="M53 12 L71 12 M50 18 L74 18" stroke="#FFEB3B" stroke-width="3"/>
        <circle cx="62" cy="-7" r="5" fill="#FFEB3B" stroke="#F9A825" stroke-width="1.5"/>
      </g>`,
  },
};

/** O filhote, com as roupinhas escolhidas. */
export function dogSvg(worn: readonly string[] = [], extraClass = ''): string {
  const back = ITEMS.filter((it) => worn.includes(it.id)).map((it) => ITEM_ART[it.id].back ?? '').join('');
  const front = ITEMS.filter((it) => worn.includes(it.id)).map((it) => ITEM_ART[it.id].front ?? '').join('');
  return `
  <svg class="dog-art ${extraClass}" viewBox="0 -14 120 134" aria-hidden="true">
    <ellipse cx="60" cy="116" rx="30" ry="5" fill="#000" opacity=".15"/>
    ${back}
    <path class="tail" d="M84 96 Q106 92 104 66 Q100 80 86 88 Z" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="60" cy="92" rx="28" ry="25" fill="${FUR}"/>
    <ellipse cx="60" cy="88" rx="14" ry="17" fill="${CREAM}"/>
    <rect x="44" y="92" width="11" height="22" rx="5.5" fill="${FUR}"/>
    <rect x="65" y="92" width="11" height="22" rx="5.5" fill="${FUR}"/>
    <ellipse cx="49.5" cy="113" rx="8" ry="4.5" fill="${CREAM}"/>
    <ellipse cx="70.5" cy="113" rx="8" ry="4.5" fill="${CREAM}"/>
    <g class="head">
      <path class="ear ear-l" d="M36 26 Q16 32 21 62 Q29 68 39 54 Z" fill="${FUR_DARK}"/>
      <path class="ear ear-r" d="M84 26 Q104 32 99 62 Q91 68 81 54 Z" fill="${FUR_DARK}"/>
      <ellipse cx="60" cy="44" rx="28" ry="26" fill="${FUR}"/>
      <ellipse cx="60" cy="31" rx="15" ry="8" fill="${FUR_LIGHT}"/>
      <ellipse cx="60" cy="57" rx="15" ry="11" fill="${CREAM}"/>
      <circle cx="41" cy="54" r="3.6" fill="#FF8A80" opacity=".55"/>
      <circle cx="79" cy="54" r="3.6" fill="#FF8A80" opacity=".55"/>
      <path d="M43 33 Q48 30 53 33 M67 33 Q72 30 77 33" fill="none" stroke="${FUR_DARK}" stroke-width="2.2" stroke-linecap="round"/>
      <g class="eyes">
        <circle cx="48" cy="42" r="5.6" fill="${INK}"/>
        <circle cx="72" cy="42" r="5.6" fill="${INK}"/>
        <circle cx="49.8" cy="40.2" r="1.9" fill="#fff"/>
        <circle cx="73.8" cy="40.2" r="1.9" fill="#fff"/>
      </g>
      <ellipse cx="60" cy="51" rx="6" ry="4.3" fill="${INK}"/>
      <ellipse cx="58.3" cy="49.6" rx="1.8" ry="1" fill="#fff" opacity=".7"/>
      <path class="mouth-closed" d="M60 55 V58 M53 58 Q56.5 62 60 58 Q63.5 62 67 58" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
      <g class="mouth-open">
        <path d="M52 57 Q60 54 68 57 Q67 68 60 68 Q53 68 52 57 Z" fill="#5D4037"/>
        <ellipse cx="60" cy="65" rx="5" ry="3.5" fill="#FF8A80"/>
      </g>
    </g>
    ${front}
  </svg>`;
}

/** Desenho de uma roupinha sozinha (para a loja). */
export function itemSvg(id: string): string {
  const art = ITEM_ART[id];
  const views: Record<string, string> = {
    cape: '10 50 100 75',
    mane: '10 -5 100 100',
    bandana: '30 55 60 40',
    bow: '35 52 50 36',
    glasses: '30 25 60 32',
    hat: '40 -15 46 46',
  };
  return `<svg viewBox="${views[id]}" aria-hidden="true">${art.back ?? ''}${art.front ?? ''}</svg>`;
}

/** Ossinho dourado (moeda do jogo). Contorno só por fora: formas com borda e, por cima, as mesmas sem borda. */
const BONE_SHAPES =
  '<circle cx="9" cy="7" r="6"/><circle cx="9" cy="17" r="6"/><circle cx="39" cy="7" r="6"/><circle cx="39" cy="17" r="6"/><rect x="8" y="6.5" width="32" height="11" rx="2"/>';
export const BONE_SVG = `<svg viewBox="-3 -3 54 30" aria-hidden="true"><g fill="#FFCA28" stroke="#E68A00" stroke-width="4">${BONE_SHAPES}</g><g fill="#FFCA28">${BONE_SHAPES}</g><path d="M14 9 h20" stroke="#FFF59D" stroke-width="2.6" stroke-linecap="round"/></svg>`;

// Regras do jogo (sem tela): o filhote pula de bloco em bloco pintando a letra.
//
// Nada aqui tem castigo: água faz o filhote voltar, portão fechado e caixote
// que não mexe só balançam. O caixote só anda para dentro da água, então
// nunca dá para deixar a fase sem saída.

import { isHidden, isLetterKind, isWater, requiredOf, type Board } from './board.ts';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

export interface State {
  readonly board: Board;
  readonly dog: number;
  /** Blocos da letra já pintados. */
  readonly painted: ReadonlySet<number>;
  /** Caixotes ainda em cima do chão. */
  readonly boxes: ReadonlySet<number>;
  /** Águas que já viraram ponte (com um caixote dentro). */
  readonly sunk: ReadonlySet<number>;
  /** Botão já apertado (portões abertos, pontes de pé). */
  readonly pressed: boolean;
  /** Ossinhos pegos nesta partida. */
  readonly bones: ReadonlySet<number>;
  readonly won: boolean;
}

/** O que aconteceu num pulo (a tela usa para animar e tocar sons). */
export type GameEvent =
  | { type: 'move'; from: number; to: number }
  | { type: 'spring'; from: number; via: number; to: number }
  | { type: 'paint'; at: number }
  | { type: 'bone'; at: number }
  | { type: 'press'; at: number; opened: number[] }
  | { type: 'push'; from: number; to: number }
  | { type: 'boxStuck'; at: number; dir: Dir }
  | { type: 'splash'; at: number; back: number }
  | { type: 'bump'; at: number; dir: Dir; what: 'edge' | 'gate' | 'house' }
  | { type: 'complete' }
  | { type: 'win' };

export function initialState(board: Board): State {
  const s: State = {
    board,
    dog: board.start,
    painted: new Set(),
    boxes: new Set(board.boxes),
    sunk: new Set(),
    pressed: false,
    bones: new Set(),
    won: false,
  };
  return s;
}

export function isComplete(s: State): boolean {
  return requiredOf(s.board).every((i) => s.painted.has(i));
}

/** Vizinho na direção (ou -1 fora do tabuleiro). */
export function neighbor(board: Board, i: number, dir: Dir, steps = 1): number {
  const r = Math.floor(i / board.cols) + (dir === 'down' ? steps : dir === 'up' ? -steps : 0);
  const c = (i % board.cols) + (dir === 'right' ? steps : dir === 'left' ? -steps : 0);
  if (r < 0 || c < 0 || r >= board.rows || c >= board.cols) return -1;
  return r * board.cols + c;
}

/** Dá para ficar em pé neste bloco agora? */
export function walkable(s: State, i: number, complete = isComplete(s)): boolean {
  if (i < 0 || s.boxes.has(i)) return false;
  const k = s.board.kinds[i];
  switch (k) {
    case 'void':
      return false;
    case 'house':
      return complete;
    case 'water':
    case 'waterLetter':
      return s.sunk.has(i);
    case 'hidden':
    case 'hiddenLetter':
    case 'gate':
      return s.pressed;
    default:
      return true;
  }
}

/** Bloco existe e aparece na tela (para desenhar). */
export function visible(s: State, i: number): boolean {
  const k = s.board.kinds[i];
  return k !== 'void' && (!isHidden(k) || s.pressed);
}

/** Onde a mola joga o filhote (ou -1 se não dá para pular). */
function springLanding(s: State, spring: number, dir: Dir, complete: boolean): number {
  const land = neighbor(s.board, spring, dir, 3);
  return land >= 0 && walkable(s, land, complete) ? land : -1;
}

/** Um pulo na direção. Devolve o novo estado e o que aconteceu. */
export function step(s: State, dir: Dir): { state: State; events: GameEvent[] } {
  if (s.won) return { state: s, events: [] };
  const b = s.board;
  const complete = isComplete(s);
  const to = neighbor(b, s.dog, dir);
  if (to < 0 || b.kinds[to] === 'void' || (isHidden(b.kinds[to]) && !s.pressed)) {
    return { state: s, events: [{ type: 'bump', at: s.dog, dir, what: 'edge' }] };
  }
  const k = b.kinds[to];

  // Caixote: só anda se do outro lado tiver água (vira ponte).
  if (s.boxes.has(to)) {
    const beyond = neighbor(b, to, dir);
    if (beyond >= 0 && isWater(b.kinds[beyond]) && !s.sunk.has(beyond)) {
      const boxes = new Set(s.boxes);
      boxes.delete(to);
      const sunk = new Set(s.sunk).add(beyond);
      const moved: State = { ...s, boxes, sunk };
      const events: GameEvent[] = [{ type: 'push', from: to, to: beyond }];
      return arrive(moved, to, events, { type: 'move', from: s.dog, to });
    }
    return { state: s, events: [{ type: 'boxStuck', at: to, dir }] };
  }
  // Água sem ponte: tchibum, e volta para onde estava.
  if (isWater(k) && !s.sunk.has(to)) {
    return { state: s, events: [{ type: 'splash', at: to, back: s.dog }] };
  }
  if (k === 'gate' && !s.pressed) {
    return { state: s, events: [{ type: 'bump', at: to, dir, what: 'gate' }] };
  }
  if (k === 'house' && !complete) {
    return { state: s, events: [{ type: 'bump', at: to, dir, what: 'house' }] };
  }
  if (k === 'spring') {
    const land = springLanding(s, to, dir, complete);
    if (land >= 0) return arrive(s, land, [], { type: 'spring', from: s.dog, via: to, to: land });
  }
  return arrive(s, to, [], { type: 'move', from: s.dog, to });
}

/** O filhote chega num bloco: pinta, pega ossinho, aperta botão, entra na casinha. */
function arrive(s: State, at: number, before: GameEvent[], move: GameEvent): { state: State; events: GameEvent[] } {
  const b = s.board;
  const events: GameEvent[] = [move, ...before];
  const wasComplete = isComplete(s);
  let painted = s.painted;
  let bones = s.bones;
  let pressed = s.pressed;
  if (isLetterKind(b.kinds[at]) && !painted.has(at)) {
    painted = new Set(painted).add(at);
    events.push({ type: 'paint', at });
  }
  if (b.bones.includes(at) && !bones.has(at)) {
    bones = new Set(bones).add(at);
    events.push({ type: 'bone', at });
  }
  if (b.kinds[at] === 'button' && !pressed) {
    pressed = true;
    const opened = b.kinds.flatMap((k, i) => (isHidden(k) || k === 'gate' ? [i] : []));
    events.push({ type: 'press', at, opened });
  }
  const won = b.kinds[at] === 'house';
  const next: State = { ...s, dog: at, painted, bones, pressed, won };
  if (!wasComplete && isComplete(next)) events.push({ type: 'complete' });
  if (won) events.push({ type: 'win' });
  return { state: next, events };
}

/** Para onde cada pulo leva, sem empurrar caixote nem cair na água (para andar sozinho). */
function walkMoves(s: State, from: number, complete: boolean): Array<[Dir, number]> {
  const out: Array<[Dir, number]> = [];
  for (const dir of DIRS) {
    const to = neighbor(s.board, from, dir);
    if (!walkable(s, to, complete)) continue;
    if (s.board.kinds[to] === 'spring') {
      const land = springLanding(s, to, dir, complete);
      out.push([dir, land >= 0 ? land : to]);
    } else {
      out.push([dir, to]);
    }
  }
  return out;
}

/** Caminho mais curto até um bloco (lista de direções), ou null. */
export function pathTo(s: State, target: number): Dir[] | null {
  if (target === s.dog) return [];
  const complete = isComplete(s);
  const prev = new Map<number, [number, Dir]>([[s.dog, [-1, 'up']]]);
  const queue = [s.dog];
  for (let qi = 0; qi < queue.length; qi++) {
    const at = queue[qi];
    for (const [dir, to] of walkMoves(s, at, complete)) {
      if (prev.has(to)) continue;
      prev.set(to, [at, dir]);
      if (to === target) {
        const path: Dir[] = [];
        for (let cur = to; cur !== s.dog; cur = prev.get(cur)![0]) path.push(prev.get(cur)![1]);
        return path.reverse();
      }
      queue.push(to);
    }
  }
  return null;
}

/** Distância (em pulos) até cada bloco alcançável andando. */
function distances(s: State): Map<number, number> {
  const complete = isComplete(s);
  const dist = new Map([[s.dog, 0]]);
  const queue = [s.dog];
  for (let qi = 0; qi < queue.length; qi++) {
    const at = queue[qi];
    for (const [, to] of walkMoves(s, at, complete)) {
      if (dist.has(to)) continue;
      dist.set(to, dist.get(at)! + 1);
      queue.push(to);
    }
  }
  return dist;
}

/**
 * Próxima coisa útil para a dica: o bloco da letra sem pintar mais perto;
 * se nenhum dá para alcançar, o botão ou o lugar de empurrar o caixote;
 * com a letra pronta, a casinha. Devolve o caminho e, se for empurrar, a direção.
 */
export function hint(s: State): { path: Dir[]; push?: Dir } | null {
  if (s.won) return null;
  const b = s.board;
  const dist = distances(s);
  const nearest = (cands: number[]) =>
    cands.filter((i) => dist.has(i)).sort((a, z) => dist.get(a)! - dist.get(z)!)[0];
  if (isComplete(s)) {
    const p = pathTo(s, b.house);
    return p ? { path: p } : null;
  }
  const todo = requiredOf(b).filter((i) => !s.painted.has(i));
  const paint = nearest(todo);
  if (paint !== undefined) return { path: pathTo(s, paint)! };
  if (!s.pressed) {
    const button = nearest(b.kinds.flatMap((k, i) => (k === 'button' ? [i] : [])));
    if (button !== undefined) return { path: pathTo(s, button)! };
  }
  // Empurrar um caixote para a água.
  let best: { stand: number; dir: Dir } | null = null;
  for (const box of s.boxes) {
    for (const dir of DIRS) {
      const beyond = neighbor(b, box, dir);
      if (beyond < 0 || !isWater(b.kinds[beyond]) || s.sunk.has(beyond)) continue;
      const back: Dir = dir === 'up' ? 'down' : dir === 'down' ? 'up' : dir === 'left' ? 'right' : 'left';
      const stand = neighbor(b, box, back);
      if (stand < 0 || !dist.has(stand)) continue;
      if (!best || dist.get(stand)! < dist.get(best.stand)!) best = { stand, dir };
    }
  }
  if (best) return { path: pathTo(s, best.stand)!, push: best.dir };
  return null;
}

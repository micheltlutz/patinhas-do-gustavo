import { describe, expect, it } from 'vitest';
import { isLetterKind, requiredOf } from '../src/game/board.ts';
import { LEVELS, NAME, SUGGESTED } from '../src/game/levels.ts';
import { DIRS, hint, initialState, neighbor, step, type State } from '../src/game/rules.ts';

/** Chave do estado ignorando a pintura (ela não muda por onde dá para andar). */
const keyOf = (s: State) => `${s.dog}|${[...s.boxes].sort()}|${[...s.sunk].sort()}|${s.pressed}`;

/** Todos os estados alcançáveis com a casinha fechada (pintura zerada). */
function explore(start: State): Map<string, State> {
  const seen = new Map<string, State>();
  const queue = [start];
  seen.set(keyOf(start), start);
  for (let qi = 0; qi < queue.length; qi++) {
    for (const d of DIRS) {
      const next = { ...step(queue[qi], d).state, painted: new Set<number>() };
      const k = keyOf(next);
      if (!seen.has(k)) {
        seen.set(k, next);
        queue.push(next);
      }
    }
  }
  return seen;
}

describe('fases', () => {
  it('são 26, de A a Z, e a sugestão começa pelo nome', () => {
    expect(LEVELS.map((l) => l.letter).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(SUGGESTED.slice(0, 7).map((i) => LEVELS[i].letter).join('')).toBe(NAME);
    expect(new Set(SUGGESTED).size).toBe(26);
  });

  it.each(LEVELS.map((l) => [l.letter, l] as const))('%s: bem desenhada', (_, level) => {
    const b = level.board;
    expect(b.cols).toBeLessThanOrEqual(10);
    expect(b.rows).toBeLessThanOrEqual(9);
    expect(b.bones).toHaveLength(3);
    expect(requiredOf(b).length).toBeGreaterThanOrEqual(9);
    expect(level.word[0].toUpperCase()).toBe(level.letter);
    // o começo encosta em algum bloco (a casinha pode estar numa ilha, como no O)
    expect(DIRS.some((d) => neighbor(b, b.start, d) >= 0 && b.kinds[neighbor(b, b.start, d)] !== 'void')).toBe(true);
    // ossinhos em cima de blocos
    for (const i of b.bones) expect(b.kinds[i] === 'ground' || isLetterKind(b.kinds[i])).toBe(true);
  });

  it.each(LEVELS.map((l) => [l.letter, l] as const))('%s: nunca trava (de qualquer situação dá para terminar)', (_, level) => {
    const b = level.board;
    const required = requiredOf(b);
    const states = explore(initialState(b));
    // Para cada situação: dá para chegar em todos os blocos da letra...
    for (const s of states.values()) {
      const reach = new Set([...explore(s).values()].map((x) => x.dog));
      for (const i of required) expect(reach.has(i), `bloco ${i} a partir de ${keyOf(s)}`).toBe(true);
      // ...e, com tudo pintado, entrar na casinha.
      const done: State = { ...s, painted: new Set(required) };
      const queue = [done];
      const seen = new Set([keyOf(done)]);
      let won = false;
      for (let qi = 0; qi < queue.length && !won; qi++) {
        for (const d of DIRS) {
          const next = step(queue[qi], d).state;
          if (next.won) won = true;
          const k = keyOf(next);
          if (!seen.has(k)) {
            seen.add(k);
            queue.push(next);
          }
        }
      }
      expect(won, `casinha a partir de ${keyOf(s)}`).toBe(true);
    }
  });

  it.each(LEVELS.map((l) => [l.letter, l] as const))('%s: seguindo só a dica, termina a fase', (_, level) => {
    let s = initialState(level.board);
    let moves = 0;
    while (!s.won && moves < 400) {
      const h = hint(s);
      expect(h, `sem dica na jogada ${moves}`).not.toBeNull();
      const dir = h!.path[0] ?? h!.push!;
      s = step(s, dir).state;
      moves++;
    }
    expect(s.won).toBe(true);
    expect(s.painted.size).toBe(requiredOf(level.board).length);
  });
});

import { describe, expect, it } from 'vitest';
import { parseBoard } from '../src/game/board.ts';
import { hint, initialState, isComplete, pathTo, step, walkable, type Dir, type State } from '../src/game/rules.ts';

const at = (s: State, r: number, c: number) => r * s.board.cols + c;
const go = (s: State, ...dirs: Dir[]) => dirs.reduce((st, d) => step(st, d).state, s);

describe('regras', () => {
  it('pular pinta a letra e pega ossinho; a casinha abre com tudo pintado', () => {
    let s = initialState(parseBoard(['S#*#H']));
    expect(step(s, 'left').events[0]).toMatchObject({ type: 'bump', what: 'edge' });
    s = go(s, 'right', 'right');
    expect(s.painted.size).toBe(2);
    expect(s.bones.size).toBe(1);
    expect(isComplete(s)).toBe(false);
    const r = step(s, 'right');
    expect(r.events.map((e) => e.type)).toEqual(['move', 'paint', 'complete']);
    expect(walkable(r.state, at(r.state, 0, 4))).toBe(true);
    const w = step(r.state, 'right');
    expect(w.events.at(-1)).toEqual({ type: 'win' });
    expect(w.state.won).toBe(true);
  });

  it('casinha fechada antes de pintar tudo', () => {
    const s = initialState(parseBoard(['#SH']));
    expect(step(s, 'right').events[0]).toMatchObject({ type: 'bump', what: 'house' });
  });

  it('caixote só anda para dentro da água e vira ponte', () => {
    const s = initialState(parseBoard(['Sxw#', '.  H']));
    const pushed = step(s, 'right');
    expect(pushed.events.map((e) => e.type)).toEqual(['move', 'push']);
    expect(pushed.state.sunk.has(2)).toBe(true);
    expect(walkable(pushed.state, 2)).toBe(true);
    // caixote sem água na frente não se mexe
    const stuck = initialState(parseBoard(['Sx.#', '   H']));
    expect(step(stuck, 'right').events[0]).toMatchObject({ type: 'boxStuck' });
  });

  it('água sem ponte: tchibum e volta para o mesmo lugar', () => {
    const s = initialState(parseBoard(['S~#H']));
    const r = step(s, 'right');
    expect(r.events[0]).toEqual({ type: 'splash', at: 1, back: 0 });
    expect(r.state).toBe(s);
  });

  it('botão abre portão e levanta ponte', () => {
    let s = initialState(parseBoard(['pS', ' g', ' r', ' H']));
    expect(step(s, 'down').events[0]).toMatchObject({ type: 'bump', what: 'gate' });
    const pressed = step(s, 'left');
    expect(pressed.events.find((e) => e.type === 'press')).toMatchObject({ opened: [3, 5] });
    s = go(pressed.state, 'right', 'down', 'down');
    expect(s.painted.size).toBe(2);
  });

  it('mola joga 3 blocos à frente; sem lugar para cair, não pula', () => {
    const s = initialState(parseBoard(['Sj  #H']));
    const r = step(s, 'right');
    expect(r.events[0]).toEqual({ type: 'spring', from: 0, via: 1, to: 4 });
    const blocked = initialState(parseBoard(['Sj  ', '#  H']));
    expect(step(blocked, 'right').events[0]).toEqual({ type: 'move', from: 0, to: 1 });
  });

  it('andar sozinho não empurra caixote nem entra na água', () => {
    const s = initialState(parseBoard(['S.x#', '~  H']));
    expect(pathTo(s, 3)).toBeNull();
    expect(pathTo(s, 1)).toEqual(['right']);
  });

  it('dica: pinta o que falta, aperta o botão, empurra o caixote, vai para a casinha', () => {
    const s = initialState(parseBoard(['S.xw#H']));
    expect(hint(s)).toEqual({ path: ['right'], push: 'right' });
  });
});

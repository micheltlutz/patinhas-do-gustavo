// O tabuleiro: blocos em 2.5D, o filhote, os objetos e as animações.
//
// Toque num bloco vizinho (ou deslize o dedo) para pular; toque num bloco
// longe e o filhote vai andando até lá sozinho.

import { sfx } from '../audio/sfx.ts';
import { isHidden, isLetterKind, requiredOf } from '../game/board.ts';
import type { Level } from '../game/levels.ts';
import { DIRS, hint, initialState, isComplete, neighbor, pathTo, step, walkable, type Dir, type GameEvent, type State } from '../game/rules.ts';
import { store } from '../storage.ts';
import { BONE_SVG, dogSvg } from './dog.ts';

export interface BoardEvents {
  /** Pegou ossinho (quantos desta fase já foram pegos, contando os de outras vezes). */
  onBone(count: number): void;
  onProgress(painted: number, total: number): void;
  onComplete(): void;
  onWin(): void;
  /** Qualquer toque (para a dica automática esperar). */
  onActivity(): void;
}

const HOP_MS = 190;
/** Espaço em cima do tabuleiro para o filhote e a casinha (em blocos). */
const TOP = 0.6;
const SIDE = 0.24;
const MAX_TILE = 118;

const PAW = `<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="currentColor"><ellipse cx="20" cy="26" rx="9" ry="7.5"/><ellipse cx="9.5" cy="15" rx="4" ry="5"/><ellipse cx="17" cy="9.5" rx="4" ry="5"/><ellipse cx="25" cy="9.5" rx="4" ry="5"/><ellipse cx="31" cy="15" rx="4" ry="5"/></g></svg>`;
const CRATE = `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="6" y="6" width="88" height="88" rx="10" fill="#C68A4E" stroke="#7B4A21" stroke-width="6"/><path d="M14 14 L86 86 M86 14 L14 86" stroke="#9C6532" stroke-width="9" stroke-linecap="round"/><rect x="6" y="6" width="88" height="88" rx="10" fill="none" stroke="#7B4A21" stroke-width="6"/></svg>`;
const FENCE = `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="#FFF3E0" stroke="#8D6E63" stroke-width="5" stroke-linejoin="round"><path d="M14 92 V26 L24 14 L34 26 V92 Z"/><path d="M40 92 V26 L50 14 L60 26 V92 Z"/><path d="M66 92 V26 L76 14 L86 26 V92 Z"/><rect x="6" y="40" width="88" height="12" rx="4"/><rect x="6" y="66" width="88" height="12" rx="4"/></g></svg>`;
const BUTTON = `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="60" rx="40" ry="26" fill="#90A4AE"/><ellipse class="cap" cx="50" cy="52" rx="34" ry="21" fill="#EF5350" stroke="#B71C1C" stroke-width="4"/><g transform="translate(50 52) scale(.62)" fill="#fff"><circle cx="-24" cy="-7" r="8"/><circle cx="-24" cy="7" r="8"/><circle cx="24" cy="-7" r="8"/><circle cx="24" cy="7" r="8"/><rect x="-24" y="-7" width="48" height="14" rx="3"/></g></svg>`;
const SPRING = `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="80" rx="34" ry="11" fill="#78909C"/><path class="coil" d="M28 76 Q72 70 70 64 Q28 60 30 52 Q72 48 70 40 Q28 36 30 30" fill="none" stroke="#546E7A" stroke-width="7" stroke-linecap="round"/><ellipse class="pad" cx="50" cy="28" rx="30" ry="11" fill="#FFCA28" stroke="#F57F17" stroke-width="4"/></svg>`;
const HOUSE = `<svg viewBox="0 0 120 120" aria-hidden="true">
  <path d="M14 58 L60 18 L106 58 Z" fill="#E53935" stroke="#B71C1C" stroke-width="5" stroke-linejoin="round"/>
  <rect x="22" y="54" width="76" height="58" rx="6" fill="#FFB74D" stroke="#E65100" stroke-width="5"/>
  <path d="M30 70 H90 M30 86 H90 M30 102 H90" stroke="#FB8C00" stroke-width="3"/>
  <path class="door" d="M44 112 V86 A16 16 0 0 1 76 86 V112 Z" fill="#4E342E"/>
  <g class="door-closed"><path d="M44 112 V86 A16 16 0 0 1 76 86 V112 Z" fill="#8D6E63" stroke="#5D4037" stroke-width="3"/><circle cx="70" cy="98" r="3" fill="#FFCA28"/></g>
  <path class="glow" d="M44 112 V86 A16 16 0 0 1 76 86 V112 Z" fill="#FFF59D"/>
  <rect x="48" y="36" width="24" height="10" rx="5" fill="#fff" stroke="#B71C1C" stroke-width="2"/>
</svg>`;
const ARROW = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 V38 M12 27 L24 39 L36 27" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ROTATE: Record<Dir, number> = { down: 0, left: 90, up: 180, right: 270 };

export class BoardView {
  readonly root: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly events: BoardEvents;
  private level: Level | null = null;
  private state: State | null = null;
  private T = 80;
  private tiles: HTMLElement[] = [];
  private readonly boxes = new Map<number, HTMLElement>();
  private readonly bones = new Map<number, HTMLElement>();
  private readonly things = new Map<number, HTMLElement>(); // portão, botão, mola, casinha
  private dog: HTMLElement;
  private hintEls: HTMLElement[] = [];
  private queue: Dir[] = [];
  private running = false;
  private pointer: { id: number; x: number; y: number } | null = null;
  /** Muda a cada fase carregada (cancela animações antigas). */
  private gen = 0;
  private saidHalf = false;

  constructor(events: BoardEvents) {
    this.events = events;
    this.root = document.createElement('div');
    this.root.className = 'board-wrap';
    this.stage = document.createElement('div');
    this.stage.className = 'board';
    this.root.append(this.stage);
    this.dog = document.createElement('div');
    this.root.addEventListener('pointerdown', (e) => this.onDown(e));
    this.root.addEventListener('pointerup', (e) => this.onUp(e));
    this.root.addEventListener('pointercancel', () => (this.pointer = null));
    new ResizeObserver(() => this.layout()).observe(this.root);
  }

  get current(): State | null {
    return this.state;
  }

  load(level: Level): void {
    this.gen++;
    this.level = level;
    this.state = initialState(level.board);
    this.queue = [];
    this.running = false;
    this.saidHalf = false;
    this.build();
    this.layout();
    this.events.onProgress(0, requiredOf(level.board).length);
    this.events.onBone(store.bonesOf(level.letter).length);
  }

  /** Um pulo (teclado ou deslizar). */
  move(dir: Dir): void {
    this.clearHint();
    this.events.onActivity();
    this.queue = [dir];
    void this.run();
  }

  /** Para tudo (troca de tela). */
  stop(): void {
    this.gen++;
    this.queue = [];
    this.running = false;
  }

  // ---------- desenho ----------

  private build(): void {
    const s = this.state!;
    const b = s.board;
    const letter = this.level!.letter;
    this.stage.replaceChildren();
    this.boxes.clear();
    this.bones.clear();
    this.things.clear();
    this.hintEls = [];
    this.tiles = b.kinds.map((k, i) => {
      const t = document.createElement('div');
      t.className = `tile ${k}`;
      if (k === 'void') t.hidden = true;
      if (isHidden(k)) t.hidden = true; // sobe quando apertar o botão
      if (isLetterKind(k)) t.classList.add('letter-tile');
      this.stage.append(t);
      // Objetos em cima do bloco.
      if (k === 'gate') this.addThing(i, 'fence', FENCE);
      if (k === 'button') this.addThing(i, 'button-obj', BUTTON);
      if (k === 'spring') this.addThing(i, 'spring-obj', SPRING);
      if (k === 'house') this.addThing(i, 'house-obj', HOUSE);
      return t;
    });
    for (const i of b.boxes) {
      const box = this.object('crate', CRATE);
      this.boxes.set(i, box);
    }
    const taken = store.bonesOf(letter);
    for (const i of b.bones) {
      const bone = this.object(`bone ${taken.includes(i) ? 'ghost' : ''}`, BONE_SVG);
      this.bones.set(i, bone);
    }
    this.dog = this.object('dog', dogSvg(store.worn));
    this.lookAt('down');
  }

  private object(cls: string, html: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `obj ${cls}`;
    el.innerHTML = html;
    this.stage.append(el);
    return el;
  }

  private addThing(i: number, cls: string, html: string): void {
    this.things.set(i, this.object(cls, html));
  }

  private rc(i: number): [number, number] {
    const cols = this.state!.board.cols;
    return [Math.floor(i / cols), i % cols];
  }

  /** Canto de cima do bloco, em px. */
  private xy(i: number): [number, number] {
    const [r, c] = this.rc(i);
    return [c * this.T, (r + TOP) * this.T];
  }

  private layout(): void {
    const s = this.state;
    if (!s) return;
    const { width, height } = this.root.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    const b = s.board;
    const T = Math.floor(Math.min(width / b.cols, height / (b.rows + TOP + SIDE + 0.1), MAX_TILE));
    this.T = T;
    this.stage.style.setProperty('--t', `${T}px`);
    this.stage.style.width = `${b.cols * T}px`;
    this.stage.style.height = `${(b.rows + TOP + SIDE) * T}px`;
    this.tiles.forEach((t, i) => this.place(t, i, 1));
    for (const [i, el] of this.things) this.place(el, i, 4);
    for (const [i, el] of this.boxes) this.place(el, i, 5);
    for (const [i, el] of this.bones) this.place(el, i, 6);
    this.placeDog(s.dog);
  }

  private place(el: HTMLElement, i: number, z: number): void {
    const [x, y] = this.xy(i);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.zIndex = String(this.rc(i)[0] * 10 + z);
  }

  private placeDog(i: number): void {
    this.dog.getAnimations().forEach((a) => a.cancel());
    this.place(this.dog, i, 7);
    this.dog.style.transform = '';
  }

  /** Olhos do filhote na direção do pulo. */
  private lookAt(dir: Dir): void {
    const eyes = this.dog.querySelector<SVGGElement>('.eyes');
    const [dx, dy] = { up: [0, -2], down: [0, 1.5], left: [-2.5, 0], right: [2.5, 0] }[dir];
    eyes?.setAttribute('transform', `translate(${dx} ${dy})`);
  }

  // ---------- toque ----------

  private onDown(e: PointerEvent): void {
    if (this.pointer) return;
    this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  private onUp(e: PointerEvent): void {
    const p = this.pointer;
    if (!p || p.id !== e.pointerId) return;
    this.pointer = null;
    if (!this.state || this.state.won) return;
    this.clearHint();
    this.events.onActivity();
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.hypot(dx, dy) > 28) {
      // Deslizou: um pulo naquela direção.
      this.queue = [Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'];
      void this.run();
      return;
    }
    const target = this.tileAt(e.clientX, e.clientY);
    if (target < 0) return;
    this.tapTile(target);
  }

  private tileAt(x: number, y: number): number {
    const b = this.state!.board;
    const box = this.stage.getBoundingClientRect();
    const c = Math.floor((x - box.left) / this.T);
    const r = Math.floor((y - box.top) / this.T - TOP);
    if (r < 0 || c < 0 || r >= b.rows || c >= b.cols) return -1;
    return r * b.cols + c;
  }

  private tapTile(target: number): void {
    const s = this.state!;
    const b = s.board;
    if (target === s.dog && !this.running) {
      this.happy();
      return;
    }
    const adjacent = DIRS.find((d) => neighbor(b, s.dog, d) === target);
    if (adjacent) {
      this.queue = [adjacent];
      void this.run();
      return;
    }
    if (walkable(s, target)) {
      const path = pathTo(s, target);
      if (path) {
        this.queue = path;
        void this.run();
      } else this.cannot();
      return;
    }
    // Água, caixote, portão...: anda até o lado e faz o último pulo na direção dele.
    let best: Dir[] | null = null;
    for (const d of DIRS) {
      const stand = neighbor(b, target, d);
      if (stand < 0 || !walkable(s, stand)) continue;
      const path = pathTo(s, stand);
      if (!path) continue;
      const last: Dir = d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left';
      if (!best || path.length + 1 < best.length) best = [...path, last];
    }
    if (best) {
      this.queue = best;
      void this.run();
    } else if (b.kinds[target] !== 'void') this.cannot();
  }

  // ---------- jogadas e animações ----------

  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const gen = this.gen;
    while (this.queue.length > 0 && gen === this.gen && this.state && !this.state.won) {
      const dir = this.queue.shift()!;
      const { state, events } = step(this.state, dir);
      this.state = state;
      const stop = await this.animate(dir, events, gen);
      if (stop) this.queue = [];
    }
    if (gen === this.gen) this.running = false;
  }

  /** Anima o que aconteceu; devolve true se deve parar de andar (bateu, caiu...). */
  private async animate(dir: Dir, events: GameEvent[], gen: number): Promise<boolean> {
    this.lookAt(dir);
    let stop = false;
    const after: Array<() => Promise<void> | void> = [];
    const push = events.find((e): e is Extract<GameEvent, { type: 'push' }> => e.type === 'push');
    for (const ev of events) {
      switch (ev.type) {
        case 'move':
          sfx.hop();
          // Empurrando: o caixote anda junto com o pulo.
          if (push) await Promise.all([this.hop(ev.from, ev.to), this.sinkBox(push.from, push.to)]);
          else await this.hop(ev.from, ev.to);
          break;
        case 'spring':
          await this.springJump(ev.from, ev.via, ev.to);
          break;
        case 'push':
          break;
        case 'paint':
          this.paint(ev.at);
          break;
        case 'bone':
          this.collectBone(ev.at);
          break;
        case 'press':
          await this.press(ev.at, ev.opened);
          break;
        case 'boxStuck':
          stop = true;
          await this.boxStuck(ev.at, dir);
          break;
        case 'splash':
          stop = true;
          await this.splash(ev.at, ev.back);
          break;
        case 'bump':
          stop = true;
          await this.bump(ev.at, dir, ev.what);
          break;
        case 'complete':
          after.push(() => this.completeLetter());
          break;
        case 'win':
          after.push(() => this.enterHouse());
          break;
      }
      if (gen !== this.gen) return true;
    }
    for (const f of after) await f();
    return stop;
  }

  private hop(from: number, to: number, height = 0.35, ms = HOP_MS): Promise<void> {
    const [x0, y0] = this.xy(from);
    const [x1, y1] = this.xy(to);
    const T = this.T;
    // Fica na frente dos blocos das duas fileiras durante o pulo.
    this.dog.style.zIndex = String(Math.max(this.rc(from)[0], this.rc(to)[0]) * 10 + 7);
    this.dog.style.left = `${x0}px`;
    this.dog.style.top = `${y0}px`;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const a = this.dog.animate(
      [
        { transform: 'translate(0, 0) scale(1.05, 0.92)' },
        { transform: `translate(${dx / 2}px, ${dy / 2 - height * T}px) scale(0.95, 1.06)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.06, 0.94)`, offset: 0.9 },
        { transform: `translate(${dx}px, ${dy}px) scale(1, 1)` },
      ],
      { duration: ms, easing: 'ease-in-out', fill: 'forwards' },
    );
    return a.finished.then(
      () => this.placeDog(to),
      () => {},
    );
  }

  private async springJump(from: number, via: number, to: number): Promise<void> {
    sfx.hop();
    await this.hop(from, via, 0.25, 150);
    const spring = this.things.get(via);
    spring?.animate([{ transform: 'scaleY(0.6)' }, { transform: 'scaleY(1.25)' }, { transform: 'none' }], {
      duration: 380,
      easing: 'ease-out',
    });
    sfx.spring();
    await this.hop(via, to, 1.6, 520);
  }

  private async sinkBox(from: number, to: number): Promise<void> {
    sfx.push();
    const box = this.boxes.get(from)!;
    this.boxes.delete(from);
    const [x0, y0] = this.xy(from);
    const [x1, y1] = this.xy(to);
    await box.animate([{ transform: 'none' }, { transform: `translate(${x1 - x0}px, ${y1 - y0}px)` }], {
      duration: 220,
      easing: 'ease-in',
      fill: 'forwards',
    }).finished.catch(() => {});
    this.splashDrops(to);
    await box.animate(
      [
        { transform: `translate(${x1 - x0}px, ${y1 - y0}px)`, opacity: 1 },
        { transform: `translate(${x1 - x0}px, ${y1 - y0 + this.T * 0.2}px) scale(0.92)`, opacity: 0.4 },
      ],
      { duration: 260, easing: 'ease-out', fill: 'forwards' },
    ).finished.catch(() => {});
    box.remove();
    this.tiles[to].classList.add('bridged');
    this.tiles[to].animate([{ transform: 'translateY(8%)' }, { transform: 'translateY(-4%)' }, { transform: 'none' }], {
      duration: 300,
    });
  }

  private paint(i: number): void {
    const tile = this.tiles[i];
    tile.classList.add('painted');
    const paw = document.createElement('div');
    paw.className = 'paw';
    paw.innerHTML = PAW;
    paw.style.setProperty('--rot', `${Math.round(Math.random() * 50 - 25)}deg`);
    tile.append(paw);
    tile.animate([{ transform: 'scale(0.92)' }, { transform: 'scale(1.06)' }, { transform: 'none' }], {
      duration: 260,
      easing: 'ease-out',
    });
    const s = this.state!;
    const total = requiredOf(s.board).length;
    sfx.paint(s.painted.size - 1);
    this.events.onProgress(s.painted.size, total);
    if (!this.saidHalf && s.painted.size >= total / 2 && s.painted.size < total) {
      this.saidHalf = true;
      sfx.say(`${this.level!.say}!`);
    }
  }

  private collectBone(i: number): void {
    const bone = this.bones.get(i);
    if (!bone) return;
    this.bones.delete(i);
    const isNew = store.addBone(this.level!.letter, i);
    if (isNew) sfx.bone();
    bone
      .animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `translateY(${-this.T * 1.2}px) scale(1.5) rotate(20deg)`, opacity: 0 },
        ],
        { duration: 520, easing: 'ease-out', fill: 'forwards' },
      )
      .finished.catch(() => {})
      .then(() => bone.remove());
    this.events.onBone(store.bonesOf(this.level!.letter).length);
  }

  private async press(at: number, opened: number[]): Promise<void> {
    sfx.press();
    this.things.get(at)?.classList.add('pressed');
    await wait(150);
    let k = 0;
    for (const i of opened) {
      const kind = this.state!.board.kinds[i];
      if (isHidden(kind)) {
        const tile = this.tiles[i];
        tile.hidden = false;
        tile.animate(
          [
            { transform: `translateY(${this.T}px)`, opacity: 0 },
            { transform: 'translateY(-8%)', opacity: 1, offset: 0.8 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 420, delay: k++ * 140, easing: 'ease-out', fill: 'backwards' },
        );
      } else if (kind === 'gate') {
        const fence = this.things.get(i);
        this.things.delete(i);
        fence
          ?.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(40%) scaleY(0.2)', opacity: 0 }], {
            duration: 420,
            delay: k++ * 140,
            fill: 'forwards',
          })
          .finished.catch(() => {})
          .then(() => fence.remove());
      }
    }
    await wait(300 + k * 140);
  }

  private async boxStuck(at: number, dir: Dir): Promise<void> {
    sfx.stuck();
    const box = this.boxes.get(at);
    const [dx, dy] = this.vec(dir, 0.08);
    box?.animate(
      [{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) rotate(4deg)` }, { transform: 'rotate(-3deg)' }, { transform: 'none' }],
      { duration: 300 },
    );
    await this.nudge(dir);
  }

  private vec(dir: Dir, amount: number): [number, number] {
    const a = amount * this.T;
    return { up: [0, -a], down: [0, a], left: [-a, 0], right: [a, 0] }[dir] as [number, number];
  }

  private nudge(dir: Dir): Promise<void> {
    const [dx, dy] = this.vec(dir, 0.18);
    return this.dog
      .animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(0.95)` }, { transform: 'none' }], {
        duration: 240,
        easing: 'ease-out',
      })
      .finished.then(
        () => {},
        () => {},
      );
  }

  private async bump(at: number, dir: Dir, what: 'edge' | 'gate' | 'house'): Promise<void> {
    if (what === 'house') {
      sfx.bark();
      this.bark();
      this.things.get(at)?.animate([{ transform: 'none' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'none' }], {
        duration: 360,
      });
    } else {
      sfx.bump();
      if (what === 'gate') {
        this.things.get(at)?.animate([{ transform: 'none' }, { transform: 'translateX(-4%)' }, { transform: 'translateX(4%)' }, { transform: 'none' }], {
          duration: 300,
        });
      }
    }
    await this.nudge(dir);
  }

  /** Caiu na água: tchibum, sacode o pelo e volta. */
  private async splash(at: number, back: number): Promise<void> {
    const [x0, y0] = this.xy(back);
    const [x1, y1] = this.xy(at);
    this.dog.style.zIndex = String(Math.max(this.rc(at)[0], this.rc(back)[0]) * 10 + 7);
    await this.dog.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: `translate(${(x1 - x0) / 2}px, ${(y1 - y0) / 2 - this.T * 0.3}px)`, offset: 0.4 },
        { transform: `translate(${x1 - x0}px, ${y1 - y0 + this.T * 0.25}px) scale(0.85)`, opacity: 0.2 },
      ],
      { duration: 320, easing: 'ease-in', fill: 'forwards' },
    ).finished.catch(() => {});
    sfx.splash();
    this.splashDrops(at);
    await wait(380);
    this.placeDog(back);
    sfx.shake();
    this.splashDrops(back, 'shake-drops');
    await this.dog.animate(
      [
        { transform: 'scale(0.8)', opacity: 0 },
        { transform: 'rotate(-12deg)', opacity: 1, offset: 0.3 },
        { transform: 'rotate(12deg)', offset: 0.5 },
        { transform: 'rotate(-8deg)', offset: 0.7 },
        { transform: 'rotate(6deg)', offset: 0.85 },
        { transform: 'none' },
      ],
      { duration: 700, easing: 'ease-out' },
    ).finished.catch(() => {});
  }

  private splashDrops(at: number, cls = 'splash-drops'): void {
    const fx = document.createElement('div');
    fx.className = `fx ${cls}`;
    fx.innerHTML = Array.from({ length: 7 }, (_, k) => `<i style="--a:${k * 51}deg"></i>`).join('');
    this.stage.append(fx);
    this.place(fx, at, 9);
    setTimeout(() => fx.remove(), 800);
  }

  private bark(): void {
    this.dog.classList.add('barking');
    setTimeout(() => this.dog.classList.remove('barking'), 420);
  }

  /** Tocou no filhote: ele late e pula de alegria. */
  private happy(): void {
    sfx.bark();
    this.bark();
    this.dog.animate([{ transform: 'none' }, { transform: `translateY(${-this.T * 0.3}px) rotate(-6deg)` }, { transform: 'none' }], {
      duration: 380,
      easing: 'ease-out',
    });
  }

  private cannot(): void {
    sfx.bump();
    this.dog.animate([{ transform: 'none' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }, { transform: 'none' }], {
      duration: 360,
    });
  }

  private async completeLetter(): Promise<void> {
    sfx.complete();
    const s = this.state!;
    const [hr, hc] = this.rc(s.board.house);
    // Onda de brilho pela letra, a partir da casinha.
    for (const i of requiredOf(s.board)) {
      const [r, c] = this.rc(i);
      this.tiles[i].animate(
        [{ transform: 'none', filter: 'brightness(1)' }, { transform: 'translateY(-10%)', filter: 'brightness(1.35)' }, { transform: 'none', filter: 'brightness(1)' }],
        { duration: 420, delay: (Math.abs(r - hr) + Math.abs(c - hc)) * 60, easing: 'ease-out' },
      );
    }
    this.things.get(s.board.house)?.classList.add('open');
    this.events.onComplete();
  }

  private async enterHouse(): Promise<void> {
    await this.dog.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-10%) scale(0.4)', opacity: 0 }], {
      duration: 420,
      easing: 'ease-in',
      fill: 'forwards',
    }).finished.catch(() => {});
    this.things.get(this.state!.board.house)?.animate(
      [{ transform: 'none' }, { transform: 'scale(1.12)' }, { transform: 'none' }],
      { duration: 400 },
    );
    this.events.onWin();
  }

  // ---------- dica ----------

  showHint(): void {
    this.clearHint();
    const s = this.state;
    if (!s || s.won) return;
    const h = hint(s);
    if (!h) return;
    let at = s.dog;
    const marks: Array<[number, Dir]> = [];
    for (const d of h.path.slice(0, 6)) {
      at = this.after(at, d, s);
      marks.push([at, d]);
    }
    marks.forEach(([i, d], k) => {
      const el = document.createElement('div');
      el.className = 'obj hint-paw';
      el.innerHTML = PAW;
      el.style.setProperty('--rot', `${ROTATE[d] + 180}deg`);
      el.style.animationDelay = `${k * 120}ms`;
      this.stage.append(el);
      this.place(el, i, 8);
      this.hintEls.push(el);
    });
    if (h.push) {
      const box = neighbor(s.board, at, h.push);
      const el = document.createElement('div');
      el.className = 'obj hint-arrow';
      el.innerHTML = ARROW;
      el.style.setProperty('--rot', `${ROTATE[h.push]}deg`);
      this.stage.append(el);
      this.place(el, box, 9);
      this.hintEls.push(el);
    }
    if (marks.length === 0 && !h.push) return;
    this.dog.animate([{ transform: 'none' }, { transform: `translateY(${-this.T * 0.2}px)` }, { transform: 'none' }], { duration: 400 });
  }

  /** Onde o filhote para dando um pulo naquela direção, andando (com mola). */
  private after(from: number, d: Dir, s: State): number {
    const b = s.board;
    const to = neighbor(b, from, d);
    if (to >= 0 && b.kinds[to] === 'spring') {
      const land = neighbor(b, to, d, 3);
      if (land >= 0 && walkable(s, land, isComplete(s))) return land;
    }
    return to;
  }

  clearHint(): void {
    for (const el of this.hintEls) el.remove();
    this.hintEls = [];
  }
}

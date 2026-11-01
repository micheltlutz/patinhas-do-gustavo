// As telas: inicial, mapa das letras, a fase e a loja de roupinhas.

import { sfx } from '../audio/sfx.ts';
import { LEVELS, NAME, SUGGESTED } from '../game/levels.ts';
import { store } from '../storage.ts';
import { BoardView } from './boardView.ts';
import { clearConfetti, confetti } from './confetti.ts';
import { BONE_SVG, ITEMS, dogSvg, itemSvg } from './dog.ts';
import { ICONS, iconButton } from './icons.ts';

export interface Nav {
  home(): void;
  map(): void;
  play(level: number): void;
  shop(): void;
}

/** Tempo parado até a dica aparecer sozinha. */
const IDLE_HINT_MS = 25_000;

function makeScreen(className: string): HTMLElement {
  const el = document.createElement('section');
  el.className = `screen ${className}`;
  el.hidden = true;
  return el;
}

function onTap<T extends HTMLElement>(button: T, action: () => void, sound = true): T {
  button.addEventListener('click', () => {
    if (sound) sfx.pop();
    action();
  });
  return button;
}

/** Próxima letra sugerida: a primeira ainda não feita (nome primeiro). */
function nextLevel(): number {
  return SUGGESTED.find((i) => !store.isDone(LEVELS[i].letter)) ?? SUGGESTED[0];
}

/** Contador de ossinhos (para gastar na loja). */
function bonePill(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'bone-pill';
  el.innerHTML = `${BONE_SVG}<b></b>`;
  return el;
}

function renderPill(el: HTMLElement): void {
  el.querySelector('b')!.textContent = String(store.balance);
}

/** Botão de voltar para "Jogos do Gustavo" (só quando aberto por ela). */
function backToGames(screen: HTMLElement): void {
  if (location.hash !== '#jogos') return;
  screen.append(onTap(iconButton('back', 'Todos os jogos', 'back-to-games'), () => location.assign('/jogos-do-gustavo/')));
}

export class HomeScreen {
  readonly el = makeScreen('home');
  private readonly soundBtn: HTMLButtonElement;
  private readonly hero: HTMLButtonElement;
  private readonly pill = bonePill();

  constructor(nav: Nav) {
    this.el.innerHTML = `
      <h1 class="title">Patinhas <span>do Gustavo</span></h1>
      <div class="hero"><button type="button" class="hero-btn" aria-label="Au au"></button><div class="hero-block"></div></div>
      <div class="home-actions"></div>`;
    this.hero = this.el.querySelector<HTMLButtonElement>('.hero-btn')!;
    this.hero.addEventListener('click', () => {
      sfx.bark();
      this.hero.classList.add('barking');
      this.hero.animate([{ transform: 'none' }, { transform: 'translateY(-12%) rotate(-4deg)' }, { transform: 'none' }], {
        duration: 420,
        easing: 'ease-out',
      });
      setTimeout(() => this.hero.classList.remove('barking'), 420);
    });
    this.soundBtn = onTap(iconButton('soundOn', 'Som'), () => {
      store.sound = !store.sound;
      this.render();
    });
    this.el.querySelector('.home-actions')!.append(
      onTap(iconButton('grid', 'Letras'), () => nav.map()),
      onTap(iconButton('play', 'Jogar', 'big play'), () => nav.play(nextLevel())),
      onTap(iconButton('shirt', 'Roupinhas', 'shop-btn'), () => nav.shop()),
      this.soundBtn,
    );
    this.el.append(this.pill);
    backToGames(this.el);
  }

  show(): void {
    this.hero.innerHTML = dogSvg(store.worn);
    renderPill(this.pill);
    this.render();
  }

  private render(): void {
    this.soundBtn.innerHTML = store.sound ? ICONS.soundOn : ICONS.soundOff;
    this.soundBtn.classList.toggle('off', !store.sound);
  }
}

export class MapScreen {
  readonly el = makeScreen('map');
  private readonly tiles: HTMLButtonElement[] = [];
  private readonly pill = bonePill();

  constructor(nav: Nav) {
    this.el.innerHTML = `<div class="topbar"></div><div class="map-body"><div class="map-grid"></div></div>`;
    this.el
      .querySelector('.topbar')!
      .append(
        onTap(iconButton('home', 'Início'), () => nav.home()),
        this.pill,
        onTap(iconButton('shirt', 'Roupinhas', 'shop-btn'), () => nav.shop()),
      );
    const grid = this.el.querySelector('.map-grid')!;
    LEVELS.forEach((level, i) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile-btn';
      if (NAME.includes(level.letter)) tile.classList.add('name-letter');
      tile.setAttribute('aria-label', level.letter);
      tile.innerHTML = `<span class="num">${level.letter}</span><span class="bones">${BONE_SVG.repeat(3)}</span><span class="sticker">${ICONS.star}</span>`;
      onTap(tile, () => nav.play(i));
      grid.append(tile);
      this.tiles.push(tile);
    });
  }

  show(): void {
    renderPill(this.pill);
    const next = nextLevel();
    const allDone = LEVELS.every((l) => store.isDone(l.letter));
    this.tiles.forEach((tile, i) => {
      const letter = LEVELS[i].letter;
      tile.classList.toggle('done', store.isDone(letter));
      tile.classList.toggle('next', !allDone && i === next);
      const got = store.bonesOf(letter).length;
      tile.querySelectorAll('.bones svg').forEach((b, k) => b.classList.toggle('got', k < got));
    });
  }
}

export class GameScreen {
  readonly el = makeScreen('game');
  private readonly board: BoardView;
  private readonly badge: HTMLButtonElement;
  private readonly bar: HTMLElement;
  private readonly boneSlots: HTMLElement;
  private readonly win: HTMLElement;
  private readonly nav: Nav;
  private level = 0;
  private idleTimer = 0;
  private session = 0;

  constructor(nav: Nav) {
    this.nav = nav;
    this.board = new BoardView({
      onBone: (n) => this.renderBones(n),
      onProgress: (p, total) => this.bar.style.setProperty('--p', String(total ? p / total : 0)),
      onComplete: () => {
        sfx.say('Agora, a casinha!');
        this.resetIdle();
      },
      onWin: () => void this.celebrate(),
      onActivity: () => this.resetIdle(),
    });

    const controls = document.createElement('div');
    controls.className = 'controls';
    controls.append(
      onTap(iconButton('grid', 'Letras'), () => nav.map()),
      onTap(
        iconButton('restart', 'Recomeçar'),
        () => {
          sfx.undo();
          this.open(this.level, false);
        },
        false,
      ),
      onTap(iconButton('bulb', 'Dica', 'hint'), () => {
        this.board.showHint();
        this.resetIdle();
      }),
    );

    const hud = document.createElement('div');
    hud.className = 'hud';
    this.badge = document.createElement('button');
    this.badge.type = 'button';
    this.badge.className = 'badge';
    this.badge.addEventListener('click', () => {
      sfx.say(LEVELS[this.level].say);
      this.badge.animate([{ transform: 'none' }, { transform: 'scale(1.15)' }, { transform: 'none' }], { duration: 300 });
    });
    this.bar = document.createElement('div');
    this.bar.className = 'paint-bar';
    this.bar.innerHTML = '<i></i>';
    this.boneSlots = document.createElement('div');
    this.boneSlots.className = 'bone-slots';
    this.boneSlots.innerHTML = BONE_SVG.repeat(3);
    hud.append(this.badge, this.bar, this.boneSlots);

    const main = document.createElement('div');
    main.className = 'game-main';
    main.append(hud, this.board.root);

    this.win = document.createElement('div');
    this.win.className = 'win';
    this.win.hidden = true;

    this.el.append(controls, main, this.win);
    window.addEventListener('keydown', (e) => {
      if (this.el.hidden || !this.win.hidden) return;
      const dir = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const)[e.key as 'ArrowUp'];
      if (dir) {
        e.preventDefault();
        this.board.move(dir);
      }
    });
  }

  open(level: number, announce = true): void {
    this.session++;
    this.level = level;
    const l = LEVELS[level];
    this.badge.textContent = l.letter;
    this.badge.setAttribute('aria-label', l.say);
    this.win.hidden = true;
    clearConfetti(this.el);
    this.board.load(l);
    this.resetIdle();
    if (announce) sfx.say(`Vamos pintar a letra ${l.say}!`);
  }

  close(): void {
    this.session++;
    clearTimeout(this.idleTimer);
    clearConfetti(this.el);
    this.board.stop();
    this.board.clearHint();
  }

  pause(): void {
    clearTimeout(this.idleTimer);
  }

  private renderBones(n: number): void {
    this.boneSlots.querySelectorAll('svg').forEach((b, k) => b.classList.toggle('got', k < n));
  }

  private resetIdle(): void {
    clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      this.board.showHint();
      this.resetIdle();
    }, IDLE_HINT_MS);
  }

  private async celebrate(): Promise<void> {
    const session = this.session;
    clearTimeout(this.idleTimer);
    const l = LEVELS[this.level];
    store.markDone(l.letter);
    sfx.win();
    confetti(this.el, 110);
    this.showWin();
    await new Promise((r) => setTimeout(r, 900));
    if (session !== this.session) return;
    sfx.say(`${l.say} de ${l.word}!`);
  }

  private showWin(): void {
    const l = LEVELS[this.level];
    const got = store.bonesOf(l.letter).length;
    const nextIdx = SUGGESTED[(SUGGESTED.indexOf(this.level) + 1) % SUGGESTED.length];
    this.win.innerHTML = `
      <div class="win-card">
        <div class="word-card">
          <span class="emoji">${l.emoji}</span>
          <span class="word"><b>${l.letter}</b>${l.word.slice(1)}</span>
        </div>
        <div class="win-bones">${Array.from({ length: 3 }, (_, k) => `<span class="${k < got ? 'got' : ''}">${BONE_SVG}</span>`).join('')}</div>
        <div class="win-actions"></div>
      </div>`;
    const actions = this.win.querySelector('.win-actions')!;
    actions.append(
      onTap(iconButton('grid', 'Letras', 'small'), () => this.nav.map()),
      onTap(iconButton('next', 'Próxima letra', 'big next'), () => this.nav.play(nextIdx)),
      onTap(iconButton('shirt', 'Roupinhas', 'small shop-btn'), () => this.nav.shop()),
    );
    this.win.hidden = false;
    this.win.querySelector('.word-card')!.addEventListener('click', () => sfx.say(`${l.say} de ${l.word}!`));
  }
}

export class ShopScreen {
  readonly el = makeScreen('shop');
  private readonly preview: HTMLElement;
  private readonly pill = bonePill();
  private readonly cards = new Map<string, HTMLButtonElement>();

  constructor(nav: Nav) {
    this.el.innerHTML = `
      <div class="topbar"></div>
      <div class="shop-body">
        <div class="shop-dog"><div class="preview"></div><div class="hero-block"></div></div>
        <div class="shop-grid"></div>
      </div>`;
    this.el.querySelector('.topbar')!.append(onTap(iconButton('back', 'Voltar'), () => nav.home()), this.pill);
    this.preview = this.el.querySelector('.preview')!;
    const grid = this.el.querySelector('.shop-grid')!;
    for (const item of ITEMS) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'item';
      card.setAttribute('aria-label', item.name);
      card.innerHTML = `<span class="art">${itemSvg(item.id)}</span><span class="price">${BONE_SVG}<b>${item.price}</b></span><span class="worn-badge">${ICONS.check}</span>`;
      card.addEventListener('click', () => this.tapItem(item.id, item.price));
      grid.append(card);
      this.cards.set(item.id, card);
    }
  }

  show(): void {
    this.render();
  }

  private tapItem(id: string, price: number): void {
    const card = this.cards.get(id)!;
    if (store.owns(id)) {
      sfx.pop();
      store.toggleWear(id);
    } else if (store.buy(id, price)) {
      sfx.buy();
      confetti(this.el, 50);
      card.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 400 });
    } else {
      // Ainda não tem ossinhos: o cartão balança e o contador pisca.
      sfx.stuck();
      card.animate([{ transform: 'none' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'none' }], { duration: 360 });
      this.pill.animate([{ transform: 'none' }, { transform: 'scale(1.2)' }, { transform: 'none' }], { duration: 400 });
      return;
    }
    this.render();
    this.preview.animate([{ transform: 'none' }, { transform: 'translateY(-8%)' }, { transform: 'none' }], { duration: 380 });
  }

  private render(): void {
    renderPill(this.pill);
    this.preview.innerHTML = dogSvg(store.worn);
    for (const item of ITEMS) {
      const card = this.cards.get(item.id)!;
      const owned = store.owns(item.id);
      card.classList.toggle('owned', owned);
      card.classList.toggle('worn', store.worn.includes(item.id));
      card.classList.toggle('affordable', !owned && store.balance >= item.price);
    }
  }
}

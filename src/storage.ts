// Progresso salvo no próprio iPad. Se o armazenamento falhar (modo privado,
// por exemplo), o jogo continua funcionando, só não lembra o progresso.

const KEY = 'patinhas-do-gustavo:v1';

interface SaveData {
  /** Letras já pintadas até o fim. */
  done: string[];
  /** Ossinhos pegos em cada letra (posição do ossinho na fase). */
  bones: Record<string, number[]>;
  /** Ossinhos gastos na loja. */
  spent: number;
  /** Roupinhas compradas e as que o filhote está usando. */
  owned: string[];
  worn: string[];
  sound: boolean;
}

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function read(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<SaveData>;
      const bones: Record<string, number[]> = {};
      if (d.bones && typeof d.bones === 'object') {
        for (const [k, v] of Object.entries(d.bones)) {
          if (Array.isArray(v)) bones[k] = v.filter((n) => Number.isInteger(n));
        }
      }
      return {
        done: strings(d.done),
        bones,
        spent: Number.isFinite(d.spent) ? Math.max(0, d.spent as number) : 0,
        owned: strings(d.owned),
        worn: strings(d.worn),
        sound: d.sound !== false,
      };
    }
  } catch {
    // ignora: começa do zero
  }
  return { done: [], bones: {}, spent: 0, owned: [], worn: [], sound: true };
}

const state = read();

function write(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sem armazenamento disponível
  }
}

export const store = {
  isDone: (letter: string) => state.done.includes(letter),
  markDone(letter: string): void {
    if (!state.done.includes(letter)) {
      state.done.push(letter);
      write();
    }
  },
  /** Ossinhos já pegos nesta letra (cada um só vale uma vez). */
  bonesOf: (letter: string): readonly number[] => state.bones[letter] ?? [],
  addBone(letter: string, at: number): boolean {
    const list = (state.bones[letter] ??= []);
    if (list.includes(at)) return false;
    list.push(at);
    write();
    return true;
  },
  /** Ossinhos para gastar. */
  get balance(): number {
    const total = Object.values(state.bones).reduce((n, l) => n + l.length, 0);
    return total - state.spent;
  },
  owns: (id: string) => state.owned.includes(id),
  buy(id: string, price: number): boolean {
    if (state.owned.includes(id) || this.balance < price) return false;
    state.owned.push(id);
    state.spent += price;
    if (!state.worn.includes(id)) state.worn.push(id);
    write();
    return true;
  },
  get worn(): readonly string[] {
    return state.worn;
  },
  toggleWear(id: string): boolean {
    if (!state.owned.includes(id)) return false;
    const i = state.worn.indexOf(id);
    if (i >= 0) state.worn.splice(i, 1);
    else state.worn.push(id);
    write();
    return i < 0;
  },
  get sound(): boolean {
    return state.sound;
  },
  set sound(on: boolean) {
    state.sound = on;
    write();
  },
};

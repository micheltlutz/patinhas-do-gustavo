// Efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio).
//
// No iPad, o áudio só pode começar depois de um toque; ele também pode ser
// interrompido quando o app vai para o segundo plano. Por isso o contexto é
// criado no primeiro toque, liberado de novo a cada toque e recriado se não
// voltar sozinho.

import { store } from '../storage.ts';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function create(): void {
  ctx = new AudioContext();
  const compressor = ctx.createDynamicsCompressor();
  master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(compressor).connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

let speechReady = false;

/** No iOS a voz só funciona depois de ser usada uma vez dentro de um toque completo. */
function unlockSpeech(): void {
  if (speechReady || !('speechSynthesis' in window)) return;
  speechReady = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    // sem voz
  }
}

function unlock(): void {
  try {
    if (!ctx) create();
    if (ctx && ctx.state !== 'running') {
      void ctx.resume().catch(() => {});
      // Um som mudo dentro do toque "destrava" o áudio no iOS.
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {
    // sem áudio neste aparelho
  }
}

export function initAudio(): void {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    // não suportado
  }
  for (const ev of ['pointerdown', 'pointerup', 'touchend']) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  }
  for (const ev of ['touchend', 'click']) {
    window.addEventListener(ev, unlockSpeech, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !ctx) return;
    void ctx.resume().catch(() => {});
    setTimeout(() => {
      if (ctx && ctx.state !== 'running') {
        void ctx.close().catch(() => {});
        ctx = null;
        master = null;
      }
    }, 400);
  });
}

function out(): { ac: AudioContext; dest: GainNode } | null {
  if (!store.sound || !ctx || !master || ctx.state !== 'running') return null;
  return { ac: ctx, dest: master };
}

function tone(
  type: OscillatorType,
  freq: number,
  at: number,
  dur: number,
  peak: number,
  freqEnd?: number,
  dest?: AudioNode,
): void {
  const o = out();
  if (!o) return;
  const t = o.ac.currentTime + at;
  const osc = o.ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = o.ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(dest ?? o.dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noiseBurst(at: number, dur: number, peak: number, filter: BiquadFilterType, f1: number, f2 = f1): void {
  const o = out();
  if (!o || !noise) return;
  const t = o.ac.currentTime + at;
  const src = o.ac.createBufferSource();
  src.buffer = noise;
  const bq = o.ac.createBiquadFilter();
  bq.type = filter;
  bq.frequency.setValueAtTime(f1, t);
  bq.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = o.ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bq).connect(g).connect(o.dest);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** Voz em português do aparelho (se tiver). */
function ptVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'pt-BR') ?? voices.find((v) => v.lang.startsWith('pt'));
}

/** Escala que sobe a cada bloco pintado (pentatônica de Dó). */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];

export const sfx = {
  /** Pulinho (nota baixa e curta). */
  hop(): void {
    tone('sine', 300, 0, 0.09, 0.14, 520);
  },
  /** Bloco pintado: notinha da escala, subindo conforme pinta. */
  paint(k: number): void {
    const f = SCALE[k % SCALE.length] * (k >= SCALE.length ? 2 : 1);
    tone('triangle', f, 0, 0.22, 0.2);
    tone('sine', f * 2, 0, 0.1, 0.05);
  },
  /** Pegou ossinho: "plim-plim". */
  bone(): void {
    tone('square', 988, 0, 0.08, 0.08);
    tone('square', 1319, 0.08, 0.22, 0.08);
  },
  /** Latido: "au!". */
  bark(): void {
    tone('sawtooth', 460, 0, 0.13, 0.18, 260);
    noiseBurst(0, 0.1, 0.12, 'bandpass', 1400, 700);
    tone('sawtooth', 480, 0.17, 0.12, 0.15, 270);
    noiseBurst(0.17, 0.09, 0.1, 'bandpass', 1400, 700);
  },
  /** Tchibum na água. */
  splash(): void {
    noiseBurst(0, 0.45, 0.3, 'lowpass', 2400, 300);
    tone('sine', 700, 0, 0.2, 0.12, 180);
  },
  /** Sacudindo o pelo. */
  shake(): void {
    for (let i = 0; i < 5; i++) noiseBurst(i * 0.07, 0.05, 0.08, 'highpass', 3000);
  },
  /** Bateu no portão / na borda. */
  bump(): void {
    tone('triangle', 200, 0, 0.12, 0.25, 140);
  },
  /** Caixote arrastando e caindo na água. */
  push(): void {
    noiseBurst(0, 0.25, 0.18, 'bandpass', 500, 300);
    noiseBurst(0.22, 0.35, 0.22, 'lowpass', 1800, 300);
  },
  /** Caixote que não se mexe. */
  stuck(): void {
    tone('square', 140, 0, 0.1, 0.08, 120);
  },
  /** Botão apertado e a ponte subindo. */
  press(): void {
    tone('square', 660, 0, 0.06, 0.1);
    [392, 523.25, 659.25, 783.99].forEach((f, i) => tone('triangle', f, 0.1 + i * 0.08, 0.18, 0.16));
  },
  /** Mola: "boing". */
  spring(): void {
    tone('sine', 220, 0, 0.35, 0.3, 880);
    tone('triangle', 330, 0.05, 0.25, 0.08, 1100);
  },
  /** Letra toda pintada: a casinha abriu. */
  complete(): void {
    [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone('triangle', f, i * 0.09, 0.3, 0.16));
  },
  /** Comprou uma roupinha. */
  buy(): void {
    [659.25, 830.61, 987.77, 1318.51].forEach((f, i) => tone('square', f, i * 0.07, 0.12, 0.07));
  },
  /** Recomeçar: som "de volta". */
  undo(): void {
    tone('sine', 700, 0, 0.18, 0.3, 300);
  },
  /** Toque em botão. */
  pop(): void {
    tone('sine', 500, 0, 0.1, 0.35, 900);
  },
  /** Festa: fase completa. */
  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone('triangle', f, i * 0.11, 0.22, 0.3));
    for (const f of [523.25, 659.25, 783.99]) tone('triangle', f, 0.5, 0.8, 0.22);
    [1568, 2093, 1760, 2637].forEach((f, i) => tone('sine', f, 0.55 + i * 0.09, 0.12, 0.08));
  },
  /** Fala com a voz do iPad. */
  say(text: string): void {
    if (!store.sound || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      const voice = ptVoice();
      if (voice) u.voice = voice;
      u.rate = 0.9;
      u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch {
      // sem voz
    }
  },
};

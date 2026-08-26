/**
 * Sound, synthesised in-house. No files, no assets, no dependencies — every
 * sound is a few oscillators with an envelope, built at the moment it plays.
 *
 * Register matters more than fidelity here (ART-DIRECTION's "mid-century
 * institutional" applies to the ears too): short, quiet, dry sounds — a
 * date-stamp thunk rather than an arcade squeal. Sine and triangle waves only,
 * low master volume, no reverb, nothing sustained.
 *
 * Browser-only by construction and driven entirely by the renderer. The
 * simulation never knows sound exists, for the same reason it never knows
 * about sprites: the bots must play the identical game.
 */

type Wave = OscillatorType;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  /** Per-sound floor between plays, so thirty kills a second is not a buzz. */
  private lastPlayed = new Map<string, number>();

  constructor() {
    try {
      this.muted = localStorage.getItem('nc-muted') === '1';
    } catch {
      /* private windows throw; sound just starts unmuted */
    }
  }

  /**
   * Create/resume the context. Must be reachable from a user gesture — the
   * title screen's "press any key" is the designed unlock point, and every
   * later keydown re-tries in case that one was missed.
   */
  unlock(): void {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.4;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('nc-muted', this.muted ? '1' : '0');
    } catch {
      /* fine — the toggle still works for this session */
    }
    return this.muted;
  }

  /** One enveloped oscillator. Everything below is built from these. */
  private tone(
    freq: number,
    opts: { wave?: Wave; gain?: number; attack?: number; decay?: number; glideTo?: number; delay?: number } = {},
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const { wave = 'sine', gain = 0.08, attack = 0.004, decay = 0.12, glideTo, delay = 0 } = opts;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + decay);
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0005, t0 + attack + decay);
    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + attack + decay + 0.05);
  }

  /** True if this sound's floor has elapsed. Records the play when it has. */
  private due(name: string, minMs: number): boolean {
    const now = performance.now();
    const last = this.lastPlayed.get(name) ?? -Infinity;
    if (now - last < minMs) return false;
    this.lastPlayed.set(name, now);
    return true;
  }

  // --- the vocabulary ----------------------------------------------------

  /** A kill: a dry tick, pitch wandering so a crowd reads as texture. */
  kill(): void {
    if (!this.due('kill', 70)) return;
    this.tone(660 + Math.random() * 240, { wave: 'triangle', gain: 0.035, decay: 0.05 });
  }

  /** Picking up a gem: a small upward blip, quieter than a kill. */
  gem(): void {
    if (!this.due('gem', 90)) return;
    this.tone(880, { gain: 0.025, decay: 0.06, glideTo: 1180 });
  }

  /** The player is hit: the lowest, dullest sound in the set. */
  hurt(): void {
    if (!this.due('hurt', 250)) return;
    this.tone(140, { wave: 'triangle', gain: 0.14, decay: 0.18, glideTo: 70 });
  }

  /** An antibody attaches: a muted stamp — paperwork, not damage. */
  attach(): void {
    if (!this.due('attach', 200)) return;
    this.tone(220, { wave: 'triangle', gain: 0.07, decay: 0.09, glideTo: 180 });
  }

  /** The offer panel opens: two patient notes. The world has stopped anyway. */
  offer(): void {
    this.tone(494, { gain: 0.06, decay: 0.22 });
    this.tone(659, { gain: 0.06, decay: 0.28, delay: 0.13 });
  }

  /** An upgrade taken: one settled note. */
  choose(): void {
    this.tone(587, { gain: 0.07, decay: 0.16 });
  }

  /** The Egg arrives: a slow swell an octave below everything else. */
  bossSpawn(): void {
    this.tone(82, { wave: 'triangle', gain: 0.16, attack: 0.4, decay: 1.2 });
    this.tone(123, { wave: 'sine', gain: 0.08, attack: 0.5, decay: 1.4, delay: 0.1 });
  }

  /** A boss volley: short and low, more warning than threat. */
  bossShot(): void {
    if (!this.due('bossShot', 300)) return;
    this.tone(196, { wave: 'triangle', gain: 0.06, decay: 0.1, glideTo: 147 });
  }

  /** The win: a quiet resolved triad. Being let in, not a fanfare. */
  win(): void {
    this.tone(330, { gain: 0.09, attack: 0.02, decay: 0.9 });
    this.tone(415, { gain: 0.07, attack: 0.02, decay: 0.9, delay: 0.08 });
    this.tone(494, { gain: 0.07, attack: 0.02, decay: 1.1, delay: 0.16 });
  }

  /** The death: one line, downward, unhurried. */
  death(): void {
    this.tone(392, { gain: 0.12, decay: 0.7, glideTo: 98 });
  }
}

/** One instance for the whole app — sound state survives scene restarts. */
export const sfx = new Sfx();

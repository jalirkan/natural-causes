/**
 * Sound, synthesised in-house. No files, no assets, no dependencies — every
 * sound is a few oscillators with an envelope, built at the moment it plays.
 *
 * Register matters more than fidelity here (ART-DIRECTION's "mid-century
 * institutional" applies to the ears too): short, quiet, dry sounds — a
 * date-stamp thunk rather than an arcade squeal. Sine and triangle waves only
 * (plus short noise bursts: low-passed for impacts, one band-passed swish for
 * a swing), low master volume, no reverb, nothing sustained.
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

  /**
   * One enveloped oscillator. Everything below is built from these. `hold`
   * keeps the peak before the decay starts; `wobble` is a pitch LFO (rate Hz,
   * depth Hz); `bend` is the pitch at the peak — the tone glides from `freq`
   * to it over the attack and hold, and `glideTo` then runs from the peak
   * over the decay instead of from the start. All default off, and off they
   * change nothing.
   */
  private tone(
    freq: number,
    opts: {
      wave?: Wave;
      gain?: number;
      attack?: number;
      decay?: number;
      glideTo?: number;
      delay?: number;
      hold?: number;
      wobble?: { rate: number; depth: number };
      bend?: number;
    } = {},
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const { wave = 'sine', gain = 0.08, attack = 0.004, decay = 0.12, glideTo, delay = 0, hold = 0, wobble, bend } = opts;
    const t0 = this.ctx.currentTime + delay;
    const end = t0 + attack + hold + decay + 0.05;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (bend !== undefined) {
      const peak = t0 + attack + hold;
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, bend), peak);
      if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), peak + decay);
    } else if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + decay);
    if (wobble) {
      const lfo = this.ctx.createOscillator();
      const depth = this.ctx.createGain();
      lfo.frequency.value = wobble.rate;
      depth.gain.value = wobble.depth;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(end);
    }
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + attack);
    if (hold > 0) env.gain.setValueAtTime(gain, t0 + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0005, t0 + attack + hold + decay);
    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(end);
  }

  /**
   * One enveloped burst of white noise — the only unpitched thing in the set.
   * Low-passed at `cutoff` for impacts (paper, a wall). `band` makes it a
   * band-pass whose centre glides from `cutoff` to `glideTo` over the burst:
   * air moving, for a swing. `attack` softens the onset. Left out, both change
   * nothing. Same gates as `tone`.
   */
  private noise(
    opts: {
      gain?: number;
      attack?: number;
      decay?: number;
      cutoff?: number;
      delay?: number;
      band?: { q: number; glideTo: number };
    } = {},
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const { gain = 0.03, attack = 0.002, decay = 0.05, cutoff = 2000, delay = 0, band } = opts;
    const t0 = this.ctx.currentTime + delay;
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.ceil(rate * (attack + decay + 0.01)), rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();
    src.buffer = buf;
    filter.type = band ? 'bandpass' : 'lowpass';
    filter.frequency.value = cutoff;
    if (band) {
      filter.Q.value = band.q;
      filter.frequency.setValueAtTime(cutoff, t0);
      filter.frequency.exponentialRampToValueAtTime(Math.max(1, band.glideTo), t0 + attack + decay);
    }
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0005, t0 + attack + decay);
    src.connect(filter).connect(env).connect(this.master);
    src.start(t0);
    src.stop(t0 + attack + decay + 0.01);
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

  // --- School ------------------------------------------------------------

  /**
   * The substitute's shot, after the clipboard pause (SCHOOL-ROSTER §3.5, §8):
   * your name called, spelled wrong. A clipped nasal "ah-HEM" — two notes
   * rising a fourth, a thin third harmonic on each for the nose. Mid register
   * and upward, so it never reads as `bossShot`'s single low fall; quieter too.
   */
  substituteShot(): void {
    if (!this.due('substituteShot', 300)) return;
    this.tone(311, { wave: 'triangle', gain: 0.035, decay: 0.05, glideTo: 294 });
    this.tone(933, { gain: 0.01, decay: 0.04 });
    this.tone(415, { wave: 'triangle', gain: 0.04, decay: 0.08, glideTo: 392, delay: 0.085 });
    this.tone(1245, { gain: 0.012, decay: 0.06, delay: 0.085 });
  }

  /**
   * The group chat's notification (ADOLESCENCE-ROSTER §3.5): the gold dot it
   * sends is a message arriving, so it sounds like one. A short bright ding,
   * two partials, quieter than the substitute's ah-hem and nothing like it.
   */
  notification(): void {
    if (!this.due('notification', 200)) return;
    this.tone(1760, { gain: 0.03, decay: 0.12 });
    this.tone(2637, { gain: 0.012, decay: 0.09, delay: 0.01 });
  }

  /**
   * The hall monitor's touch stops you dead (§3.4): a dull thud into a wall,
   * then a small descending boop as the cartoon slides down it.
   */
  stun(): void {
    if (!this.due('stun', 300)) return;
    this.noise({ gain: 0.05, decay: 0.03, cutoff: 350 });
    this.tone(95, { wave: 'triangle', gain: 0.1, decay: 0.06, glideTo: 55 });
    this.tone(520, { gain: 0.035, decay: 0.08, glideTo: 330, delay: 0.07 });
  }

  /**
   * Homework lands where you were a moment ago (§3.3): a soft paper slap with
   * a little low body. Fires often, so it is the quietest thing in the set and
   * wanders slightly so a run of them does not repeat.
   */
  homeworkLand(): void {
    if (!this.due('homeworkLand', 120)) return;
    this.noise({ gain: 0.022, decay: 0.045, cutoff: 1500 + Math.random() * 700 });
    this.tone(140 + Math.random() * 30, { wave: 'triangle', gain: 0.025, decay: 0.05, glideTo: 110 });
  }

  /**
   * The Gym Teacher's whistle (§9): a shrill pea-whistle trill, the fast pitch
   * wobble being the pea. Short (~350ms) for each volley; `long` holds it
   * ~1.2s with a slow fade for the fight ending on PARTICIPATION.
   */
  whistle(long = false): void {
    if (!long && !this.due('whistle', 300)) return;
    const wobble = { rate: 50, depth: 110 };
    if (long) this.tone(2750, { gain: 0.022, attack: 0.02, hold: 0.5, decay: 0.68, wobble });
    else this.tone(2750, { gain: 0.022, attack: 0.01, hold: 0.2, decay: 0.14, wobble });
  }

  // --- Adolescence -------------------------------------------------------

  /**
   * The group chat's three dots (ADOLESCENCE-ROSTER §3.5): someone is typing.
   * Three soft high ticks, a little uneven like thumbs, done in ~150ms. It
   * plays on every consult in the act, so it is barely there and floored, and
   * a room of them reads as murmur rather than a drum roll.
   */
  typing(): void {
    if (!this.due('typing', 300)) return;
    const tick = { wave: 'triangle' as const, gain: 0.012, attack: 0.002, decay: 0.018 };
    this.tone(1700 + Math.random() * 60, tick);
    this.tone(1820 + Math.random() * 60, { ...tick, delay: 0.06 });
    this.tone(1760 + Math.random() * 60, { ...tick, delay: 0.13 });
  }

  /**
   * Driver's ed pulling onto the field (§3.2): a low engine swelling in and
   * dropping two semitones as it goes by, the doppler centred on the peak. A
   * fast putter on the pitch is the motor; the octave partial keeps it audible
   * on laptop speakers. ~340ms, and a swell where `hurt` is a fall.
   */
  carPass(): void {
    if (!this.due('carPass', 400)) return;
    const env = { attack: 0.12, decay: 0.22 };
    this.tone(118, { ...env, wave: 'triangle', gain: 0.06, glideTo: 104, wobble: { rate: 32, depth: 5 } });
    this.tone(236, { ...env, gain: 0.02, glideTo: 208, wobble: { rate: 32, depth: 10 } });
  }

  /**
   * Prom's telegraph (§4): the lights going down and the slow song starting.
   * A held minor third, low-mid and soft, the upper note leaning in late, with
   * a slow vibrato for the mirror ball turning; ~700ms. Everything the whistle
   * is not: low, round, two notes, no trill.
   */
  slowSong(): void {
    if (!this.due('slowSong', 700)) return;
    this.tone(220, { wave: 'triangle', gain: 0.045, attack: 0.12, hold: 0.28, decay: 0.3, wobble: { rate: 4.5, depth: 1.5 } });
    this.tone(261.63, {
      wave: 'triangle',
      gain: 0.035,
      attack: 0.12,
      hold: 0.24,
      decay: 0.3,
      delay: 0.04,
      wobble: { rate: 4.5, depth: 1.8 },
    });
  }

  // --- College -----------------------------------------------------------

  /**
   * The registrar's consult (COLLEGE-ROSTER §3.5): the bell on the ledge,
   * struck once. A bright sine dying fast, with a quiet inharmonic partial
   * (2.76x, a small bell's) that dies faster still; ~200ms. Lower than the
   * group chat's ding and not a fifth, so a counter never reads as a phone.
   */
  bell(): void {
    if (!this.due('bell', 300)) return;
    this.tone(1319, { gain: 0.032, attack: 0.002, decay: 0.19 });
    this.tone(3640, { gain: 0.008, attack: 0.001, decay: 0.07 });
  }

  /**
   * The registrar's shot (§3.5): a HOLD is stamped, not pinged. A dull thump,
   * low-passed paper over a short falling body, ~70ms. On the post, not the
   * hit: the hit is the hall monitor's stop, which already has its sound.
   */
  stamp(): void {
    if (!this.due('stamp', 150)) return;
    this.noise({ gain: 0.04, decay: 0.035, cutoff: 800 });
    this.tone(150, { wave: 'triangle', gain: 0.08, attack: 0.003, decay: 0.06, glideTo: 95 });
  }

  /**
   * The Loan compounds (§4): the adding machine's tape advancing. A click and
   * a lower clack 40ms apart, each a band-passed tick of noise over a tiny
   * triangle for the metal; ~60ms, and the only sound the Loan makes of its
   * own. Five seconds apart at its placeholder rate, so the floor is a guard.
   */
  tapeTick(): void {
    if (!this.due('tapeTick', 300)) return;
    this.noise({ gain: 0.03, decay: 0.01, cutoff: 3200, band: { q: 3, glideTo: 2800 } });
    this.tone(1100, { wave: 'triangle', gain: 0.018, attack: 0.001, decay: 0.012 });
    this.noise({ gain: 0.035, decay: 0.014, cutoff: 1900, delay: 0.04, band: { q: 3, glideTo: 1600 } });
    this.tone(760, { wave: 'triangle', gain: 0.022, attack: 0.001, decay: 0.016, delay: 0.04 });
  }

  // --- The Office --------------------------------------------------------

  /**
   * A ping worn (OFFICE-ROSTER §3.3): the notification's small cousin. Two
   * short high sine notes a fourth apart, rising, ~180ms, and quieter than
   * the group chat's ding — a thing that wants a second, not a message. It
   * plays instead of `attach`'s stamp for a ping; an invoice worn here is
   * still a stamp.
   */
  ping(): void {
    if (!this.due('ping', 200)) return;
    this.tone(1568, { gain: 0.018, attack: 0.002, decay: 0.07 });
    this.tone(2093, { gain: 0.016, attack: 0.002, decay: 0.1, delay: 0.075 });
  }

  /**
   * The commute arriving (§3.2): a train passing, where driver's ed is a car.
   * A low triangle that bends up two semitones as it nears and falls four
   * past the peak, a slow judder on the pitch for the rails, the octave for
   * laptop speakers, and low-passed noise swelling under it for the rumble;
   * ~1.2s. Lower and three times longer than `carPass`, and no louder.
   */
  carriage(): void {
    if (!this.due('carriage', 900)) return;
    const env = { attack: 0.45, hold: 0.1, decay: 0.6 };
    this.tone(73, { ...env, wave: 'triangle', gain: 0.05, bend: 82, glideTo: 65, wobble: { rate: 11, depth: 2 } });
    this.tone(146, { ...env, gain: 0.014, bend: 164, glideTo: 130, wobble: { rate: 11, depth: 4 } });
    this.noise({ gain: 0.025, attack: 0.45, decay: 0.7, cutoff: 320 });
  }

  /**
   * A meeting closing round the player (§3.4, and the Reorg's restructure):
   * chairs pulled in. A narrow band of noise dragged downward, a rough
   * triangle juddering under it for the legs, then a second, shorter chair
   * just behind; ~300ms. Narrower and slower than Backhand's swish, and it
   * falls less far.
   */
  chairs(): void {
    if (!this.due('chairs', 300)) return;
    this.noise({ gain: 0.045, attack: 0.012, decay: 0.2, cutoff: 1500, band: { q: 4, glideTo: 520 } });
    this.tone(250, { wave: 'triangle', gain: 0.014, attack: 0.012, decay: 0.2, glideTo: 160, wobble: { rate: 36, depth: 30 } });
    this.noise({ gain: 0.032, attack: 0.01, decay: 0.13, cutoff: 1150, delay: 0.14, band: { q: 4, glideTo: 450 } });
  }

  /**
   * The Reorg's telegraph (§4): the memo drafted and sent down the chain. A
   * soft paper flutter — two short, wide band-passed breaths of noise high
   * up, 70ms apart, soft-edged, nothing pitched under them; ~130ms. The
   * column it announces fires on `bossShot`.
   */
  memo(): void {
    if (!this.due('memo', 600)) return;
    this.noise({ gain: 0.03, attack: 0.008, decay: 0.04, cutoff: 3400, band: { q: 1.4, glideTo: 2600 } });
    this.noise({ gain: 0.024, attack: 0.008, decay: 0.05, cutoff: 2900, delay: 0.07, band: { q: 1.4, glideTo: 2200 } });
  }

  // --- Family ------------------------------------------------------------

  /**
   * A bill arriving (FAMILY-ROSTER §3.1, §6), a late fee included: the
   * doorbell. Two sine chimes a major third apart, falling — ding, dong —
   * each with a faint octave for the bar; ~600ms. Bills arrive all act, more
   * than one a second by the end, so it is quiet, texture before it is news,
   * and floored at a second: a room of fees is the bell rung again, never a
   * carillon. It falls where the offer's two notes rise.
   */
  doorbell(): void {
    if (!this.due('doorbell', 1000)) return;
    this.tone(784, { gain: 0.02, attack: 0.004, decay: 0.26 });
    this.tone(1568, { gain: 0.004, attack: 0.003, decay: 0.1 });
    this.tone(622, { gain: 0.02, attack: 0.004, decay: 0.38, delay: 0.2 });
    this.tone(1244, { gain: 0.004, attack: 0.003, decay: 0.12, delay: 0.2 });
  }

  /**
   * The phone consulting (§3.5): it rings. An electric bell is a hammer
   * striking two gongs twenty-odd times a second, so each burr is five
   * struck sine notes 42ms apart, alternating a minor third and dying before
   * the next; two burrs, ~460ms. The strikes are the burr, where the
   * whistle's trill is a pitch wobble. Its HELLO? lands silent: the ring
   * said it.
   */
  ring(): void {
    if (!this.due('ring', 500)) return;
    for (const burr of [0, 0.25]) {
      for (let i = 0; i < 5; i++) {
        this.tone(i % 2 === 0 ? 1175 : 1397, { gain: 0.016, attack: 0.002, decay: 0.04, delay: burr + i * 0.042 });
      }
    }
  }

  /**
   * The toddler taking hold (§3.4): a squeaky toy squeezed. A sine bent up
   * most of an octave as the air goes through the reed, a quick waver on it,
   * then the breath the toy lets out after, a soft band of noise falling
   * away; ~220ms. The only pleased sound in the life.
   */
  squeak(): void {
    if (!this.due('squeak', 300)) return;
    this.tone(980, { gain: 0.024, attack: 0.015, hold: 0.05, decay: 0.07, bend: 1660, glideTo: 1480, wobble: { rate: 30, depth: 25 } });
    this.noise({ gain: 0.012, attack: 0.02, decay: 0.12, cutoff: 2300, delay: 0.07, band: { q: 1.2, glideTo: 1400 } });
  }

  /**
   * A flat-pack arriving (§3.2): the tape torn off the box. A band of noise
   * rising as the strip comes away faster, six stick-slip ticks rattling
   * through it at uneven intervals; ~250ms, dry. It rises where the chairs
   * drag downward and the memo flutters down.
   */
  tape(): void {
    if (!this.due('tape', 400)) return;
    this.noise({ gain: 0.024, attack: 0.03, decay: 0.2, cutoff: 1500, band: { q: 1.8, glideTo: 3200 } });
    for (let i = 0; i < 6; i++) {
      const cutoff = 2200 + i * 180 + Math.random() * 400;
      const delay = 0.015 + i * 0.032 + Math.random() * 0.01;
      this.noise({ gain: 0.018, decay: 0.007, cutoff, delay, band: { q: 3, glideTo: cutoff * 1.1 } });
    }
  }

  /**
   * The Mortgage's statement drafted (§4), its telegraph: the letterbox in
   * its door — the door is its mouth — lifting and snapping shut. A light
   * brass tick, then 90ms on the snap: a firmer band of noise over a short
   * metal ring and a low body for the door; ~200ms. The DUE it announces
   * fires on `bossShot`.
   */
  statement(): void {
    if (!this.due('statement', 600)) return;
    this.noise({ gain: 0.018, decay: 0.012, cutoff: 2400, band: { q: 3, glideTo: 2100 } });
    this.tone(880, { wave: 'triangle', gain: 0.008, attack: 0.001, decay: 0.03, glideTo: 830 });
    this.noise({ gain: 0.022, decay: 0.025, cutoff: 1400, delay: 0.09, band: { q: 2, glideTo: 1100 } });
    this.tone(520, { wave: 'triangle', gain: 0.012, attack: 0.001, decay: 0.08, glideTo: 490, delay: 0.09 });
    this.tone(130, { wave: 'triangle', gain: 0.024, attack: 0.002, decay: 0.07, glideTo: 95, delay: 0.09 });
  }

  /**
   * A Mortgage window paid (§4): the till. A soft cash-register ding — a
   * dull clack for the drawer, then one bright bell with a quick inharmonic
   * shimmer, left to ring out; ~470ms. At most once a window; a missed
   * window is a bill at the door, and the doorbell has it.
   */
  ding(): void {
    if (!this.due('ding', 1000)) return;
    this.noise({ gain: 0.02, decay: 0.02, cutoff: 1200 });
    this.tone(170, { wave: 'triangle', gain: 0.025, attack: 0.002, decay: 0.035, glideTo: 130 });
    this.tone(2217, { gain: 0.022, attack: 0.002, decay: 0.42, delay: 0.04 });
    this.tone(5320, { gain: 0.005, attack: 0.001, decay: 0.08, delay: 0.04 });
  }

  // --- Decline -----------------------------------------------------------

  /**
   * A medication arriving (DECLINE-ROSTER §3.1, §6): the pills rattling. One
   * dry shake of a bottle — two high band-passed ticks of noise 55ms apart,
   * nothing pitched under them, each wandering a little; ~75ms. Medications
   * arrive the whole act, 0.7 a second from the start and 1.6 by the end, so
   * the rattle is near-constant: the quietest thing in the act and floored at
   * a second, as the doorbell is — a pharmacy shelf, never maracas.
   *
   * The Rattle's swing (G-054) is this same sound at the other end of the
   * life, and passes its own `floorMs`: it swings every second or sooner, and
   * a second's floor against a second's cooldown drops about every other
   * swing on frame jitter alone. One floor between them either way, so a
   * swing and a dose on the same beat are one shake.
   */
  rattle(floorMs = 1000): void {
    if (!this.due('rattle', floorMs)) return;
    const first = 3400 + Math.random() * 500;
    const second = 2800 + Math.random() * 500;
    this.noise({ gain: 0.016, decay: 0.012, cutoff: first, band: { q: 2.5, glideTo: first * 0.85 } });
    this.noise({ gain: 0.013, decay: 0.016, cutoff: second, delay: 0.055, band: { q: 2.5, glideTo: second * 0.85 } });
  }

  /**
   * The weather entering (§3.2): the rain. A soft wash of wide band-passed
   * noise swelling in over half a second and sighing away over a second as
   * its centre falls an octave — a front going over, not a storm; ~1.5s, the
   * longest of the act's own sounds and quieter than the train. About one a
   * half minute, so the floor only keeps a pair from stacking.
   */
  rain(): void {
    if (!this.due('rain', 1500)) return;
    this.noise({ gain: 0.022, attack: 0.5, decay: 1.0, cutoff: 2600, band: { q: 0.8, glideTo: 1300 } });
  }

  /**
   * A flight of stairs landing (§3.4): the stairs' creak. A low sine bent down
   * as the weight goes onto the tread, a stick-slip judder on it for the wood,
   * and a narrow band of noise dragged down with it for the rasp; ~450ms, and
   * slow where the chairs scrape. Once a flight: it never adjourns, so it
   * never creaks again.
   */
  creak(): void {
    if (!this.due('creak', 600)) return;
    this.tone(200, { gain: 0.034, attack: 0.07, hold: 0.1, decay: 0.28, bend: 150, glideTo: 128, wobble: { rate: 26, depth: 12 } });
    this.noise({ gain: 0.016, attack: 0.07, decay: 0.34, cutoff: 950, band: { q: 6, glideTo: 560 } });
  }

  /**
   * The insurance form consulting (§3.5): the decision stamped. A rubber
   * stamp's thump — the registrar's `stamp`, drier: a softer, lower pad of
   * noise and a short falling body, both gone in 40ms, where the stamp's ring
   * out to 60; ~45ms, and quieter. It sounds on the consult, so the DENIED it
   * decides lands silent, as the phone's HELLO? does.
   */
  denied(): void {
    if (!this.due('denied', 300)) return;
    this.noise({ gain: 0.022, decay: 0.02, cutoff: 600 });
    this.tone(120, { wave: 'triangle', gain: 0.038, attack: 0.004, decay: 0.035, glideTo: 82 });
  }

  /**
   * Time (§4): the clock's tick. A small dry escapement — a bright click of
   * narrow noise over a short, faintly falling triangle for the case; ~35ms.
   * Once a quarter turn of the hand, then once a second for the last five;
   * never at zero, where the act's word says it. Lower than the group chat's
   * typing, and one tick where that is three.
   */
  tick(): void {
    if (!this.due('tick', 400)) return;
    this.noise({ gain: 0.018, decay: 0.006, cutoff: 4200, band: { q: 4, glideTo: 3800 } });
    this.tone(1050, { wave: 'triangle', gain: 0.02, attack: 0.001, decay: 0.03, glideTo: 990 });
  }

  // --- G-044's weapons ---------------------------------------------------

  /**
   * Backhand's swing: a band-passed breath of noise whose centre falls about
   * two octaves as it goes, ~120ms — the air a slap moves, not the slap. Once
   * per frame however many arcs swung, so a three-arc swing is one swish.
   */
  sweep(): void {
    if (!this.due('sweep', 90)) return;
    this.noise({ gain: 0.045, attack: 0.02, decay: 0.1, cutoff: 2600 + Math.random() * 400, band: { q: 1.6, glideTo: 650 } });
  }

  /**
   * Judgement lands: a gavel on its block. A low sine thump dropping as it
   * dies, a hollow partial on top for the wood, and a bright click for the
   * contact; ~90ms, and never on the telegraph — the verdict is the landing.
   */
  gavel(): void {
    if (!this.due('gavel', 80)) return;
    this.noise({ gain: 0.04, decay: 0.006, cutoff: 5000 });
    this.tone(175, { gain: 0.11, attack: 0.002, decay: 0.08, glideTo: 110 });
    this.tone(640, { wave: 'triangle', gain: 0.03, attack: 0.001, decay: 0.03, glideTo: 560 });
  }

  // --- G-054's kid's things ----------------------------------------------

  /**
   * The Cry: a short falling "waah". Two triangles a few hertz apart, so they
   * beat into a wail, opening up a little on the "w", holding, then sliding
   * down most of a fifth; a slow quaver on both for the sob. ~0.5s, and
   * quieter together than `bossShot`'s one note — a panic button, not an
   * alarm. PLACEHOLDER: every number here, untried at the link.
   */
  cry(): void {
    if (!this.due('cry', 400)) return;
    const env = { wave: 'triangle' as const, attack: 0.06, hold: 0.08, decay: 0.36, wobble: { rate: 6.5, depth: 9 } };
    this.tone(520, { ...env, gain: 0.028, bend: 620, glideTo: 410 });
    this.tone(527, { ...env, gain: 0.02, bend: 629, glideTo: 402, delay: 0.012 });
  }

  /**
   * Spilt Milk bursting: the splat. A low sine plop falling out from under a
   * wide band of noise that slides down as the spill spreads, then one small
   * drop landing just after; ~150ms, wet where the stamp and DENIED are dry.
   * PLACEHOLDER: every number here, untried at the link.
   */
  splat(): void {
    if (!this.due('splat', 150)) return;
    this.tone(130, { gain: 0.055, attack: 0.003, decay: 0.09, glideTo: 62 });
    this.noise({ gain: 0.03, attack: 0.004, decay: 0.13, cutoff: 1700, band: { q: 1.2, glideTo: 420 } });
    this.tone(430, { gain: 0.014, attack: 0.002, decay: 0.045, glideTo: 270, delay: 0.07 });
  }

  /**
   * Personal Space with someone in it: a soft, dull tap, a knuckle on a desk.
   * ~40ms and very quiet, the caller throttling it to one every 0.6s while
   * anything stands in a ring, so a crowd at the rope is a slow tut-tut.
   */
  auraTick(): void {
    if (!this.due('auraTick', 150)) return;
    this.noise({ gain: 0.014, decay: 0.022, cutoff: 600 + Math.random() * 200 });
    this.tone(210, { gain: 0.016, attack: 0.003, decay: 0.035, glideTo: 180 });
  }
}

/** One instance for the whole app — sound state survives scene restarts. */
export const sfx = new Sfx();

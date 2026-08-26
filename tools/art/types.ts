import type { ActId } from './palette';

/**
 * `icon` is UI art: it lives on the offer cards' ink surface, never on the
 * field, so CHECK judges it against ink and the enemy value ceiling does not
 * apply — an icon may wear paper, which on the field is the player's alone.
 */
export type AssetRole = 'player' | 'swarm' | 'boss' | 'pickup' | 'icon';

export interface AssetSpec {
  /** Filename stem. Also the key in the packed atlas. */
  id: string;
  /** Human name, as it would appear in the enemy data file. */
  name: string;
  act: ActId;
  role: AssetRole;
  /**
   * The subject half of the prompt. The style half is appended by the
   * pipeline and is identical for every asset — consistency is not the
   * prompt's job (D-005).
   */
  subject: string;
  /**
   * One sentence, required of every enemy before it ships (PLAN.md
   * mechanism 2). A "flying skull" cannot answer it; a "substitute teacher
   * who does not know your name" can. Written to be lifted verbatim into the
   * enemy data file.
   */
  whyThisStage?: string;
  /** What the asset is testing. Test batch only. */
  tests?: string;
  /**
   * Law 4 override (G-013). Ruled geometry characterises one object rather
   * than styling a whole act, so it is declared per asset. Omit for the act's
   * default, which is hand-cut everywhere.
   */
  geometry?: 'hand-cut' | 'ruled';
  /** Base seed. Rejections mutate it rather than escalating to a human. */
  seed: number;
  /** Longest side of the finished sprite — the act's scale grid. */
  targetSize: number;
}

export interface GenerationRecord {
  assetId: string;
  model: string;
  seed: number;
  prompt: string;
  styleSuffix: string;
  attempt: number;
  rejected: Array<{ seed: number; failures: string[] }>;
  checks: Array<{ name: string; pass: boolean; measured: number; expected: string }>;
  generatedAt: string;
}

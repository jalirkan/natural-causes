import type { ActId } from './palette';

export type AssetRole = 'player' | 'swarm' | 'boss' | 'pickup';

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

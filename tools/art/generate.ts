import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertContentRule } from './content-rule';
import { fullPrompt, styleSuffix } from './batch';
import type { AssetSpec } from './types';

/**
 * Stage 1 — GENERATE. Flux via fal.
 *
 * Provider is fal, one of the two named in D-004 (Replicate or fal). The
 * decision that matters there is not fal-versus-Replicate, it is
 * API-versus-Midjourney: quality per image is the wrong metric, assets per
 * unattended hour is the right one.
 */

export const DEFAULT_MODEL = 'fal-ai/flux/dev';
const ENDPOINT = 'https://fal.run/';

export function loadKey(cwd = process.cwd()): string {
  if (process.env['FAL_KEY']) return process.env['FAL_KEY'];

  const envFile = resolve(cwd, '.env');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      if (trimmed.slice(0, eq).trim() === 'FAL_KEY') {
        return trimmed
          .slice(eq + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  }
  throw new Error('FAL_KEY not found. Put it in .env at the repo root (it is gitignored).');
}

export interface GenerateOptions {
  model?: string;
  /** Square generation size. 1024 gives the CUT stage room to work. */
  size?: number;
  steps?: number;
  guidance?: number;
  key?: string;
  cwd?: string;
}

export interface GenerateResult {
  png: Buffer;
  seed: number;
  model: string;
  prompt: string;
}

async function post(url: string, key: string, body: unknown): Promise<Response> {
  // One retry on transient network/5xx. Anything else is a real failure and
  // should surface rather than be silently swallowed in an overnight run.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status >= 500 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('unreachable');
}

/**
 * Generate one image for one asset at one seed.
 *
 * The content rule is asserted BEFORE the network call, on every text field of
 * the spec. A prompt that violates D-007 is never sent — that is the whole
 * point of putting the check here rather than in review.
 */
export async function generate(
  spec: AssetSpec,
  seed: number,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const model = options.model ?? DEFAULT_MODEL;
  const size = options.size ?? 1024;
  const prompt = fullPrompt(spec);

  assertContentRule(`asset "${spec.id}"`, {
    name: spec.name,
    subject: spec.subject,
    whyThisStage: spec.whyThisStage,
    prompt,
    styleSuffix: styleSuffix(spec.act),
  });

  const key = options.key ?? loadKey(options.cwd);

  const res = await post(`${ENDPOINT}${model}`, key, {
    prompt,
    image_size: { width: size, height: size },
    num_inference_steps: options.steps ?? 32,
    guidance_scale: options.guidance ?? 3.5,
    num_images: 1,
    seed,
    output_format: 'png',
    enable_safety_checker: true,
  });

  if (!res.ok) {
    throw new Error(`fal ${model} returned ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    images?: Array<{ url: string }>;
    has_nsfw_concepts?: boolean[];
  };
  const url = json.images?.[0]?.url;
  if (!url) throw new Error(`fal returned no image: ${JSON.stringify(json).slice(0, 300)}`);

  if (json.has_nsfw_concepts?.[0]) {
    throw new Error(`fal flagged the output for "${spec.id}" — regenerate with a different seed`);
  }

  const img = await fetch(url);
  if (!img.ok) throw new Error(`could not download generated image: ${img.status}`);

  return { png: Buffer.from(await img.arrayBuffer()), seed, model, prompt };
}

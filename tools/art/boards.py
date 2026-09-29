#!/usr/bin/env python3
"""
Concept boards from tools/art/boards/PROMPTS.md, with a local image model.

    python tools/art/boards.py                 # every direction, every scene, one seed
    python tools/art/boards.py --dry           # print the prompts, touch no model
    python tools/art/boards.py -d 1,3 -s A     # directions 1 and 3, scene A only
    python tools/art/boards.py --model sdxl    # the full SDXL base (GPU, best quality)

Models (Hugging Face ids, downloaded on first run):
    sdxl-turbo  stabilityai/sdxl-turbo                 4 steps, fast; runs on a CPU
    sd-turbo    stabilityai/sd-turbo                   1-4 steps, fastest, smaller
    sdxl        stabilityai/stable-diffusion-xl-base-1.0   25 steps, needs a GPU

Output: boards/<direction>-<scene>-<seed>.png, 16:9. Needs: torch, diffusers,
transformers, accelerate, safetensors (pip install them; torch first).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROMPTS = ROOT / 'boards' / 'PROMPTS.md'

MODELS = {
    'sdxl-turbo': ('stabilityai/sdxl-turbo', 4, 0.0, (768, 432)),
    'sd-turbo': ('stabilityai/sd-turbo', 2, 0.0, (768, 432)),
    'sdxl': ('stabilityai/stable-diffusion-xl-base-1.0', 25, 6.0, (1024, 576)),
}
NEGATIVE = 'text, watermark, blurry, extra limbs, logo, deformed'


def parse(md: str) -> dict[str, tuple[str, str, dict[str, str]]]:
    """{ '1': (name, style, {'A': scene, 'B': scene, 'C': scene}) }."""
    out: dict[str, tuple[str, str, dict[str, str]]] = {}
    current: str | None = None
    for line in md.splitlines():
        head = re.match(r'^## (\d+) · (.+)$', line)
        if head:
            current = head.group(1)
            out[current] = (head.group(2).strip(), '', {})
            continue
        if current is None:
            continue
        name, style, scenes = out[current]
        style_line = re.match(r'^`(.+) —`\s*$', line)
        if style_line and not style:
            out[current] = (name, style_line.group(1).strip(), scenes)
            continue
        scene = re.match(r'^- ([ABC]): `— (.+)`\s*$', line)
        if scene:
            scenes[scene.group(1)] = scene.group(2).strip()
    return {k: v for k, v in out.items() if v[1] and v[2]}


def prompt_for(style: str, scene: str) -> str:
    return f'{style}, {scene}'


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('-d', '--directions', default='1,2,3,4,5', help='comma list, e.g. 1,3')
    ap.add_argument('-s', '--scenes', default='A,B,C', help='comma list of A,B,C')
    ap.add_argument('--seeds', default='1', help='comma list of seeds')
    ap.add_argument('--model', default='sdxl-turbo', choices=sorted(MODELS))
    ap.add_argument('--steps', type=int, default=None, help="override the model's step count")
    ap.add_argument('--out', default=str(ROOT.parent.parent / 'boards'))
    ap.add_argument('--dry', action='store_true', help='print the prompts and stop')
    args = ap.parse_args()

    boards = parse(PROMPTS.read_text(encoding='utf-8'))
    if not boards:
        print(f'no directions parsed from {PROMPTS}', file=sys.stderr)
        return 2
    directions = [d.strip() for d in args.directions.split(',') if d.strip()]
    scenes = [s.strip().upper() for s in args.scenes.split(',') if s.strip()]
    seeds = [int(s) for s in args.seeds.split(',') if s.strip()]
    jobs = []
    for d in directions:
        if d not in boards:
            print(f'no direction {d}; have {", ".join(boards)}', file=sys.stderr)
            return 2
        name, style, scene_map = boards[d]
        for s in scenes:
            if s not in scene_map:
                print(f'direction {d} has no scene {s}', file=sys.stderr)
                return 2
            for seed in seeds:
                jobs.append((d, name, s, seed, prompt_for(style, scene_map[s])))

    model_id, steps, guidance, (w, h) = MODELS[args.model]
    steps = args.steps or steps
    if args.dry:
        for d, name, s, seed, prompt in jobs:
            print(f'[{d}{s} seed {seed}] {name}\n  {prompt}\n')
        print(f'{len(jobs)} boards · {model_id} · {steps} steps · {w}x{h}')
        return 0

    import torch  # noqa: WPS433 — imported here so --dry needs no torch
    from diffusers import AutoPipelineForText2Image

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    dtype = torch.float16 if device == 'cuda' else torch.float32
    print(f'loading {model_id} on {device} ({dtype})…', flush=True)
    pipe = AutoPipelineForText2Image.from_pretrained(model_id, torch_dtype=dtype, variant='fp16' if device == 'cuda' else None)
    pipe = pipe.to(device)
    if device == 'cpu':
        torch.set_num_threads(max(1, torch.get_num_threads()))

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for i, (d, name, s, seed, prompt) in enumerate(jobs, 1):
        target = out / f'{d}-{s}-{seed}.png'
        if target.exists():
            print(f'[{i}/{len(jobs)}] {target.name} exists, skipping', flush=True)
            continue
        print(f'[{i}/{len(jobs)}] {name} · scene {s} · seed {seed}', flush=True)
        g = torch.Generator(device=device).manual_seed(seed)
        kwargs = dict(prompt=prompt, num_inference_steps=steps, guidance_scale=guidance, width=w, height=h, generator=g)
        if guidance > 0:
            kwargs['negative_prompt'] = NEGATIVE
        image = pipe(**kwargs).images[0]
        image.save(target)
        print(f'    → {target}', flush=True)
    print(f'done: {len(jobs)} boards in {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

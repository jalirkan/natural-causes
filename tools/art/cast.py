#!/usr/bin/env python3
"""
Render a cast — every character of one act — with one model, one style line
and one seed, cut each render out with a matting model, and drop the results
where `pnpm art:intake` picks them up: assets/raw/<id>.png (RGBA) and
assets/raw/<id>.json (provenance).

    python tools/art/cast.py --cast tools/art/boards/SCHOOL-CAST.md
    python tools/art/cast.py --cast ... --only dodgeball --seed 3
    python tools/art/cast.py --cast ... --model dreamshaper --out /tmp/x --dry

Cast file format (one act per file):

    # any title
    style: <words appended to every prompt>
    negative: <negative prompt, used when the model takes one>
    - <asset id>: <what this character is>

Models: sdxl-turbo (fastest), dreamshaper (DreamShaper XL turbo), sdxl (base,
slow). All run on CPU in bfloat16 here; on a CUDA machine they use fp16.
Cutting: rembg with the isnet-general-use model (no key, ~180 MB on first use).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

MODELS = {
    # id, steps, guidance, takes a negative prompt
    'sdxl-turbo':  ('stabilityai/sdxl-turbo', 5, 0.0, False),
    'dreamshaper': ('Lykon/dreamshaper-xl-v2-turbo', 7, 2.0, True),
    'sdxl':        ('stabilityai/stable-diffusion-xl-base-1.0', 26, 6.5, True),
}
PREFIX = '3D rendered toy-like'


def parse_cast(path: Path) -> tuple[str, str, dict[str, str]]:
    style, negative, cast = '', '', {}
    for line in path.read_text(encoding='utf-8').splitlines():
        if m := re.match(r'^style:\s*(.+)$', line):
            style = m.group(1).strip()
        elif m := re.match(r'^negative:\s*(.+)$', line):
            negative = m.group(1).strip()
        elif m := re.match(r'^-\s*([a-z0-9-]+):\s*(.+)$', line):
            cast[m.group(1)] = m.group(2).strip()
    if not cast:
        sys.exit(f'{path}: no "- id: description" lines')
    return style, negative, cast


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--cast', required=True)
    ap.add_argument('--out', default='assets/raw')
    ap.add_argument('--model', default='sdxl-turbo', choices=sorted(MODELS))
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--size', type=int, default=768)
    ap.add_argument('--steps', type=int, default=None)
    ap.add_argument('--only', default=None, help='comma-separated ids')
    ap.add_argument('--force', action='store_true', help='re-render ids that already have a png')
    ap.add_argument('--dry', action='store_true', help='print the prompts and stop')
    args = ap.parse_args()

    style, negative, cast = parse_cast(Path(args.cast))
    if args.only:
        keep = set(args.only.split(','))
        missing = keep - set(cast)
        if missing:
            sys.exit(f'not in the cast file: {", ".join(sorted(missing))}')
        cast = {k: v for k, v in cast.items() if k in keep}
    model_id, steps, guidance, takes_negative = MODELS[args.model]
    steps = args.steps or steps
    prompts = {k: f'{PREFIX} {v}, {style}' for k, v in cast.items()}

    if args.dry:
        for k, p in prompts.items():
            print(f'{k}: {p}')
        if takes_negative:
            print(f'negative: {negative}')
        return 0

    import torch
    from diffusers import AutoPipelineForText2Image
    from rembg import new_session, remove

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    dtype = torch.float16 if device == 'cuda' else (torch.bfloat16 if torch.backends.mkldnn.is_available() else torch.float32)
    variant = 'fp16' if dtype != torch.float32 else None
    try:
        pipe = AutoPipelineForText2Image.from_pretrained(model_id, torch_dtype=dtype, variant=variant)
    except Exception:
        pipe = AutoPipelineForText2Image.from_pretrained(model_id, torch_dtype=dtype)
    pipe = pipe.to(device)
    cutter = new_session('isnet-general-use')

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for k, p in prompts.items():
        png = out / f'{k}.png'
        if png.exists() and not args.force:
            print(f'skip {k} (exists; --force to redo)')
            continue
        t0 = time.time()
        kwargs = dict(prompt=p, num_inference_steps=steps, guidance_scale=guidance, width=args.size, height=args.size,
                      generator=torch.Generator(device=device).manual_seed(args.seed))
        if takes_negative:
            kwargs['negative_prompt'] = negative
        image = pipe(**kwargs).images[0]
        (out / f'{k}-render.png').write_bytes(b'')  # placeholder so a crash mid-cut is visible
        image.save(out / f'{k}-render.png')
        cut = remove(image.convert('RGB'), session=cutter)
        cut.save(png)
        (out / f'{k}.json').write_text(json.dumps({
            'model': model_id, 'seed': args.seed, 'steps': steps, 'guidance': guidance,
            'width': args.size, 'height': args.size, 'prompt': p,
            'negative': negative if takes_negative else '', 'cutter': 'rembg isnet-general-use',
            'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        }, indent=2) + '\n', encoding='utf-8')
        print(f'→ {png}  ({time.time() - t0:.0f}s, {args.model}, seed {args.seed})', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

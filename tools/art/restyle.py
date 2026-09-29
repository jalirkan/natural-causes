#!/usr/bin/env python3
"""
Repaint a real game screenshot in a candidate style (image-to-image), so the
layout is fixed and only the look varies.

    python tools/art/restyle.py --init shot.png --out dir --model sdxl-turbo \
        --prompt "..." --strength 0.7 --seed 7 [--steps N] [--negative "..."]

Models: sdxl-turbo (fast), sdxl (stabilityai/stable-diffusion-xl-base-1.0,
slow, guidance and negative prompts work). Output is <out>/<name>.png.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

MODELS = {
    'sdxl-turbo': ('stabilityai/sdxl-turbo', 6, 0.0),
    'sdxl': ('stabilityai/stable-diffusion-xl-base-1.0', 24, 6.5),
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--init', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('--model', default='sdxl-turbo', choices=sorted(MODELS))
    ap.add_argument('--prompt', required=True)
    ap.add_argument('--negative', default='text, watermark, blurry, deformed, extra limbs, logo, ui, hud')
    ap.add_argument('--strength', type=float, default=0.7)
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--steps', type=int, default=None)
    ap.add_argument('--width', type=int, default=768)
    ap.add_argument('--height', type=int, default=432)
    args = ap.parse_args()

    import torch
    from PIL import Image
    from diffusers import AutoPipelineForImage2Image

    model_id, steps, guidance = MODELS[args.model]
    steps = args.steps or steps
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    dtype = torch.float16 if device == 'cuda' else (torch.bfloat16 if torch.backends.mkldnn.is_available() else torch.float32)
    variant = 'fp16' if dtype != torch.float32 else None
    try:
        pipe = AutoPipelineForImage2Image.from_pretrained(model_id, torch_dtype=dtype, variant=variant)
    except Exception:
        pipe = AutoPipelineForImage2Image.from_pretrained(model_id, torch_dtype=dtype)
    pipe = pipe.to(device)

    init = Image.open(args.init).convert('RGB').resize((args.width, args.height), Image.LANCZOS)
    g = torch.Generator(device=device).manual_seed(args.seed)
    kwargs = dict(prompt=args.prompt, image=init, strength=args.strength, num_inference_steps=steps, guidance_scale=guidance, generator=g)
    if guidance > 0:
        kwargs['negative_prompt'] = args.negative
    t0 = time.time()
    image = pipe(**kwargs).images[0]
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    target = out / f'{args.name}.png'
    image.save(target)
    print(f'→ {target}  ({time.time() - t0:.0f}s, {args.model}, strength {args.strength}, steps {steps})', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

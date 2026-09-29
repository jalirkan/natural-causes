#!/usr/bin/env python3
"""
One character as a figure on a neutral ground, for a style sheet — optionally
holding to a reference image with IP-Adapter, so the same figure comes back.

    python tools/art/figure.py --out dir --name kid-1 --seed 1 --prompt "..."
    python tools/art/figure.py --out dir --name kid-ref-2 --seed 2 --prompt "..." --ref dir/kid-1.png --ref-scale 0.7

Models: sdxl-turbo (default, fast) or sdxl. IP-Adapter weights come from
h94/IP-Adapter (sdxl_models) on first use.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

MODELS = {
    'sdxl-turbo': ('stabilityai/sdxl-turbo', 4, 0.0),
    'sdxl': ('stabilityai/stable-diffusion-xl-base-1.0', 28, 6.5),
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('--model', default='sdxl-turbo', choices=sorted(MODELS))
    ap.add_argument('--prompt', required=True)
    ap.add_argument('--negative', default='text, watermark, blurry, deformed, extra limbs, logo, multiple characters, crowd')
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--steps', type=int, default=None)
    ap.add_argument('--size', type=int, default=640)
    ap.add_argument('--ref', default=None, help='reference image for IP-Adapter')
    ap.add_argument('--ref-scale', type=float, default=0.7)
    args = ap.parse_args()

    import torch
    from PIL import Image
    from diffusers import AutoPipelineForText2Image

    model_id, steps, guidance = MODELS[args.model]
    steps = args.steps or steps
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    dtype = torch.float16 if device == 'cuda' else (torch.bfloat16 if torch.backends.mkldnn.is_available() else torch.float32)
    variant = 'fp16' if dtype != torch.float32 else None
    try:
        pipe = AutoPipelineForText2Image.from_pretrained(model_id, torch_dtype=dtype, variant=variant)
    except Exception:
        pipe = AutoPipelineForText2Image.from_pretrained(model_id, torch_dtype=dtype)
    pipe = pipe.to(device)

    kwargs = dict(prompt=args.prompt, num_inference_steps=steps, guidance_scale=guidance, width=args.size, height=args.size,
                  generator=torch.Generator(device=device).manual_seed(args.seed))
    if guidance > 0:
        kwargs['negative_prompt'] = args.negative
    if args.ref:
        pipe.load_ip_adapter('h94/IP-Adapter', subfolder='sdxl_models', weight_name='ip-adapter_sdxl.bin')
        pipe.set_ip_adapter_scale(args.ref_scale)
        kwargs['ip_adapter_image'] = Image.open(args.ref).convert('RGB')
    t0 = time.time()
    image = pipe(**kwargs).images[0]
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    target = out / f'{args.name}.png'
    image.save(target)
    print(f'→ {target}  ({time.time() - t0:.0f}s, {args.model}, seed {args.seed}{", ref " + str(args.ref_scale) if args.ref else ""})', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

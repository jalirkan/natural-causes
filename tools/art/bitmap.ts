import sharp from 'sharp';

/** A raw RGBA image. Every pipeline stage takes one and returns one. */
export interface Bitmap {
  data: Buffer;
  width: number;
  height: number;
}

export const CHANNELS = 4;

export function index(bmp: Bitmap, x: number, y: number): number {
  return (y * bmp.width + x) * CHANNELS;
}

export function alphaAt(bmp: Bitmap, x: number, y: number): number {
  return bmp.data[index(bmp, x, y) + 3]!;
}

export async function fromPng(png: Buffer): Promise<Bitmap> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function toPng(bmp: Bitmap): Promise<Buffer> {
  return sharp(bmp.data, { raw: { width: bmp.width, height: bmp.height, channels: CHANNELS } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export function blank(width: number, height: number): Bitmap {
  return { data: Buffer.alloc(width * height * CHANNELS, 0), width, height };
}

export function clone(bmp: Bitmap): Bitmap {
  return { data: Buffer.from(bmp.data), width: bmp.width, height: bmp.height };
}

/** Resize with nearest-neighbour, which keeps flat fills flat. */
export async function resize(bmp: Bitmap, width: number, height: number): Promise<Bitmap> {
  const { data, info } = await sharp(bmp.data, {
    raw: { width: bmp.width, height: bmp.height, channels: CHANNELS },
  })
    .resize(width, height, { kernel: 'nearest', fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Smooth resize. Used only by the readability check, never for output. */
export async function resizeSmooth(bmp: Bitmap, width: number, height: number): Promise<Bitmap> {
  const { data, info } = await sharp(bmp.data, {
    raw: { width: bmp.width, height: bmp.height, channels: CHANNELS },
  })
    .resize(width, height, { kernel: 'lanczos3', fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Bounding box of pixels above an alpha threshold, or null if fully clear. */
export function opaqueBounds(bmp: Bitmap, threshold = 8): Bounds | null {
  let left = bmp.width;
  let top = bmp.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < bmp.height; y++) {
    for (let x = 0; x < bmp.width; x++) {
      if (bmp.data[index(bmp, x, y) + 3]! > threshold) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, top, right, bottom };
}

export function crop(bmp: Bitmap, b: Bounds): Bitmap {
  const width = b.right - b.left + 1;
  const height = b.bottom - b.top + 1;
  const out = blank(width, height);
  for (let y = 0; y < height; y++) {
    const src = index(bmp, b.left, b.top + y);
    bmp.data.copy(out.data, y * width * CHANNELS, src, src + width * CHANNELS);
  }
  return out;
}

/** Centre a bitmap on a transparent square canvas of the given size. */
export function centreOn(bmp: Bitmap, size: number): Bitmap {
  const out = blank(size, size);
  const ox = Math.floor((size - bmp.width) / 2);
  const oy = Math.floor((size - bmp.height) / 2);
  for (let y = 0; y < bmp.height; y++) {
    const dy = oy + y;
    if (dy < 0 || dy >= size) continue;
    for (let x = 0; x < bmp.width; x++) {
      const dx = ox + x;
      if (dx < 0 || dx >= size) continue;
      const s = index(bmp, x, y);
      const d = index(out, dx, dy);
      bmp.data.copy(out.data, d, s, s + CHANNELS);
    }
  }
  return out;
}

/** Count of pixels above an alpha threshold. */
export function opaqueCount(bmp: Bitmap, threshold = 8): number {
  let n = 0;
  for (let i = 3; i < bmp.data.length; i += CHANNELS) {
    if (bmp.data[i]! > threshold) n++;
  }
  return n;
}

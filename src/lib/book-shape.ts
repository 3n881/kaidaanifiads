import "server-only";
import sharp from "sharp";
import { BOOK_RATIO, isBookShaped } from "@/lib/covers";

/**
 * Covers are shown in 3:4 boxes that fill and crop (cards, thumbnails), so a
 * square or landscape upload lost its sides. Pad any other shape to 3:4 with
 * the image's own edge colour instead — nothing is cut off. Also applies the
 * phone's rotation (EXIF) so the shape is measured upright.
 */
export async function toBookShape(input: Buffer): Promise<Buffer> {
  const upright = await sharp(input).rotate().toBuffer({ resolveWithObject: true });
  const { width, height } = upright.info;
  if (isBookShaped(width, height)) return upright.data;
  const targetW = Math.max(width, Math.round(height * BOOK_RATIO));
  const targetH = Math.max(height, Math.round(width / BOOK_RATIO));
  const padX = targetW - width;
  const padY = targetH - height;
  // Average colour of the outer ring of a small copy = the border colour.
  const size = 16;
  const { data, info } = await sharp(upright.data)
    .resize(size, size, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  let count = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x !== 0 && y !== 0 && x !== size - 1 && y !== size - 1) continue;
      const i = (y * size + x) * info.channels;
      sum[0] += data[i];
      sum[1] += data[i + 1];
      sum[2] += data[i + 2];
      count++;
    }
  }
  const [r, g, b] = sum.map((v) => Math.round(v / count));
  return sharp(upright.data)
    .extend({
      top: Math.floor(padY / 2),
      bottom: Math.ceil(padY / 2),
      left: Math.floor(padX / 2),
      right: Math.ceil(padX / 2),
      background: { r, g, b, alpha: 1 },
    })
    .png()
    .toBuffer();
}

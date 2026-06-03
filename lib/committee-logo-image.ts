/** Pixels at or below this max(R,G,B) are treated as knock-out background. */
export const COMMITTEE_LOGO_DARK_BG_THRESHOLD = 72;

/** Dark, low-saturation pixels (badge circles, JPEG fringe). */
export function isCommitteeLogoBackgroundPixel(
  r: number,
  g: number,
  b: number,
  a: number
): boolean {
  if (a < 12) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= COMMITTEE_LOGO_DARK_BG_THRESHOLD) return true;
  if (max <= 92 && max - min <= 20) return true;
  return false;
}

/**
 * Remove background connected to image edges (typical circular black badge behind emblems).
 */
export function knockoutCommitteeLogoImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const pixelIndex = (x: number, y: number) => y * width + x;
  const dataIndex = (x: number, y: number) => pixelIndex(x, y) * 4;

  const enqueue = (x: number, y: number) => {
    const pi = pixelIndex(x, y);
    if (visited[pi]) return;
    const di = dataIndex(x, y);
    if (!isCommitteeLogoBackgroundPixel(data[di], data[di + 1], data[di + 2], data[di + 3])) {
      return;
    }
    visited[pi] = 1;
    queue.push(x, y);
  };

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const di = dataIndex(x, y);
    data[di + 3] = 0;
    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }
}

/**
 * Strip near-black backgrounds from committee logo uploads so cards show only the emblem.
 */
export async function stripCommitteeLogoBackground(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof document === "undefined") {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    knockoutCommitteeLogoImageData(imageData.data, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "logo";
    return new File([blob], `${base}.png`, { type: "image/png" });
  } finally {
    bitmap?.close();
  }
}

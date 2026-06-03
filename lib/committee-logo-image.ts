/** Pixels at or below this max(R,G,B) become transparent (dark badge backgrounds). */
const DARK_BG_THRESHOLD = 52;

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
    const { data, width, height } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      const maxChannel = Math.max(data[i], data[i + 1], data[i + 2]);
      if (maxChannel <= DARK_BG_THRESHOLD) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(new ImageData(data, width, height), 0, 0);

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

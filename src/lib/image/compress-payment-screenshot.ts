const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024;
const MAX_DATA_URL_CHARACTERS = 700_000;
const TARGET_SIZE_BYTES = 450_000;
const MAX_EDGE = 1400;

export type CompressedPaymentScreenshot = {
  dataUrl: string;
  mimeType: "image/webp" | "image/jpeg";
  sizeBytes: number;
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Payment screenshot could not be read."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Payment screenshot could not be read."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Payment screenshot could not be compressed.")), type, quality);
  });
}

export async function compressPaymentScreenshot(file: File): Promise<CompressedPaymentScreenshot> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Choose a PNG, JPG, JPEG or WEBP payment screenshot.");
  }
  if (!file.size || file.size > MAX_ORIGINAL_BYTES) {
    throw new Error("The original payment screenshot must be 5 MB or smaller.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Payment screenshot could not be opened. Choose another image.");
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Payment screenshot could not be compressed.");

    canvas.width = width;
    canvas.height = height;
    context.drawImage(bitmap, 0, 0, width, height);
    const supportsWebp = canvas.toDataURL("image/webp").startsWith("data:image/webp,");
    const mimeType = supportsWebp ? "image/webp" : "image/jpeg";

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const quality = Math.max(0.42, 0.78 - (attempt % 4) * 0.11);
      const blob = await canvasToBlob(canvas, mimeType, quality);
      const dataUrl = await blobToDataUrl(blob);
      if (blob.size <= TARGET_SIZE_BYTES && dataUrl.length <= MAX_DATA_URL_CHARACTERS) {
        return { dataUrl, mimeType, sizeBytes: blob.size };
      }

      width = Math.max(320, Math.floor(width * 0.84));
      height = Math.max(320, Math.floor(height * 0.84));
      canvas.width = width;
      canvas.height = height;
      context.drawImage(bitmap, 0, 0, width, height);
    }
  } finally {
    bitmap.close();
  }

  throw new Error("Payment screenshot is too large. Please upload a clearer screenshot or crop unnecessary areas.");
}
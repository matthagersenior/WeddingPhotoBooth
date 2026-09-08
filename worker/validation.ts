export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_THUMB_BYTES = 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadValidation =
  | { ok: true }
  | { ok: false; status: 400 | 413 | 415; error: string };

export function normalizeContentType(value: string): string {
  return value.split(";", 1)[0].trim().toLowerCase();
}

export function validateUpload(
  contentType: string,
  size: number,
  maxBytes = MAX_IMAGE_BYTES,
): UploadValidation {
  const normalized = normalizeContentType(contentType);
  if (!SUPPORTED_IMAGE_TYPES.has(normalized)) {
    return { ok: false, status: 415, error: "Unsupported image type." };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, status: 400, error: "Image is empty." };
  }
  if (size > maxBytes) {
    return { ok: false, status: 413, error: "Image is too large." };
  }
  return { ok: true };
}

export function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength).trimEnd() || null;
}

export function normalizeFilterId(value: unknown): string {
  if (typeof value !== "string") return "natural";
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9-]{1,32}$/.test(normalized) ? normalized : "natural";
}

export function extensionForContentType(contentType: string): "jpg" | "png" | "webp" {
  switch (normalizeContentType(contentType)) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

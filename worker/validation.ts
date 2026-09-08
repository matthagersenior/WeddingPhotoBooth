export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_THUMB_BYTES = 1024 * 1024;

export function validateUpload(_contentType: string, _size: number) {
  throw new Error("not implemented");
}

export function normalizeOptionalText(_value: unknown, _maxLength: number): string | null {
  throw new Error("not implemented");
}

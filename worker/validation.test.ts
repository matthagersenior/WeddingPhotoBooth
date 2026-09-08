import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, MAX_THUMB_BYTES, normalizeOptionalText, validateUpload } from "./validation";

describe("upload validation", () => {
  it("accepts supported image types within size limits", () => {
    expect(validateUpload("image/jpeg", MAX_IMAGE_BYTES)).toEqual({ ok: true });
    expect(validateUpload("image/webp", MAX_THUMB_BYTES)).toEqual({ ok: true });
  });
  it("rejects unsupported content types", () => {
    expect(validateUpload("image/heic", 10)).toEqual({ ok: false, status: 415, error: "Unsupported image type." });
  });
  it("rejects zero or oversized uploads", () => {
    expect(validateUpload("image/jpeg", 0)).toEqual({ ok: false, status: 400, error: "Image is empty." });
    expect(validateUpload("image/jpeg", MAX_IMAGE_BYTES + 1)).toEqual({ ok: false, status: 413, error: "Image is too large." });
  });
});

describe("guest copy normalization", () => {
  it("trims text, collapses whitespace, and applies a maximum length", () => {
    expect(normalizeOptionalText("  A   very   happy guest  ", 12)).toBe("A very happy");
  });
  it("returns null for blank optional text", () => {
    expect(normalizeOptionalText("   \n  ", 80)).toBeNull();
  });
});

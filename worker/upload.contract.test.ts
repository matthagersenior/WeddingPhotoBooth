import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

describe("photo upload persistence contract", () => {
  it("buffers incoming image bytes before writing them to R2", () => {
    expect(source).toContain("await request.arrayBuffer()");
    expect(source).toContain("bytes.byteLength");
    expect(source).toContain("env.PHOTOS.put(key, bytes");
    expect(source).not.toContain("env.PHOTOS.put(key, request.body");
  });
});

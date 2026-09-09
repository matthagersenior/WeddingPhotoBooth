import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

describe("wedding photo booth UI contracts", () => {
  it("uses the phone photo picker without forcing the camera", () => {
    expect(source).toContain('type="file"');
    expect(source).toContain('accept="image/*"');
    expect(source).not.toContain('capture="environment"');
  });

  it("keeps the live camera preview explicitly autoplaying and waits for video readiness", () => {
    expect(source).toContain("autoPlay");
    expect(source).toContain("loadedmetadata");
    expect(source).toContain("videoWidth");
  });

  it("uses all six supplied couple photos in the experience", () => {
    expect(source).toContain('from "../download.jpeg"');
    for (let index = 1; index <= 5; index += 1) {
      expect(source).toContain(`from "../download (${index}).jpeg"`);
    }
  });

  it("composites the last supplied photo into the center of the QR code", () => {
    expect(source).toContain("QRCode.toCanvas");
    expect(source).toContain("drawImage");
    expect(source).toContain("couplePhoto6");
  });
});

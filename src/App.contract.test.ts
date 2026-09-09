import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const booth = readFileSync(new URL("./pages/BoothPage.tsx", import.meta.url), "utf8");
const camera = readFileSync(new URL("./camera.ts", import.meta.url), "utf8");
const couplePhotos = readFileSync(new URL("./couplePhotos.ts", import.meta.url), "utf8");
const qr = readFileSync(new URL("./qr.ts", import.meta.url), "utf8");
const main = readFileSync(new URL("./main.tsx", import.meta.url), "utf8");

describe("wedding photo booth UI contracts", () => {
  it("uses the phone photo picker without forcing the camera", () => {
    expect(booth).toContain('type="file"');
    expect(booth).toContain('accept="image/*"');
    expect(booth).toContain("showOpenFilePicker");
    expect(booth).not.toContain('capture="environment"');
  });

  it("keeps the live camera preview explicitly autoplaying and waits for video readiness", () => {
    expect(booth).toContain("autoPlay");
    expect(camera).toContain("loadedmetadata");
    expect(camera).toContain("videoWidth");
    expect(camera).toContain("videoHeight");
  });

  it("uses all six supplied couple photos in the experience", () => {
    expect(couplePhotos).toContain('from "../download.jpeg"');
    for (let index = 1; index <= 5; index += 1) {
      expect(couplePhotos).toContain(`from "../download (${index}).jpeg"`);
    }
    expect(booth).toContain("COUPLE_PHOTOS");
  });

  it("composites the last supplied photo into the center of the QR code", () => {
    expect(qr).toContain("QRCode.toCanvas");
    expect(qr).toContain("drawImage");
    expect(qr).toContain("couplePhoto6");
    expect(qr).toContain('errorCorrectionLevel: "H"');
  });

  it("boots the corrected wedding app", () => {
    expect(main).toContain('import WeddingApp from "./WeddingApp"');
    expect(main).toContain("<WeddingApp />");
  });
});

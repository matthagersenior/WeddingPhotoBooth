import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));

describe("Cloudflare deploy secret contract", () => {
  it("uses a deploy command that uploads ADMIN_PASSWORD from the build environment as a runtime secret", () => {
    expect(packageJson.scripts["deploy:cloudflare"]).toBe("node scripts/deploy-with-secrets.mjs");

    const deployScriptPath = resolve("scripts/deploy-with-secrets.mjs");
    expect(existsSync(deployScriptPath)).toBe(true);

    const deploySource = readFileSync(deployScriptPath, "utf8");
    expect(deploySource).toContain("process.env.ADMIN_PASSWORD");
    expect(deploySource).toContain("--secrets-file");
    expect(deploySource).not.toContain("console.log(password)");
  });
});

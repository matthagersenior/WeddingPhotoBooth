import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("ADMIN_PASSWORD build secret is required for deployment.");
  process.exit(1);
}

const tempDirectory = await mkdtemp(join(tmpdir(), "wedding-photo-booth-"));
const secretsFile = join(tempDirectory, "secrets.json");

try {
  await writeFile(
    secretsFile,
    JSON.stringify({ ADMIN_PASSWORD: password }),
    { mode: 0o600 },
  );

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(
    npx,
    ["wrangler", "deploy", "--secrets-file", secretsFile],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code));
  });

  if (exitCode !== 0) {
    process.exitCode = typeof exitCode === "number" ? exitCode : 1;
  }
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}

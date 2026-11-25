const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { parseEnv } = require("node:util");
const { spawn } = require("node:child_process");

function validateStagingUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password || url.search || url.hash) {
    throw new Error("Homologação local exige API_URL em loopback, sem credenciais ou parâmetros.");
  }
  return url.href.replace(/\/+$/, "");
}

function stagingEnvironment(projectRoot, environment = process.env) {
  const file = [".env.staging.local", ".env.staging.example"].map(name => resolve(projectRoot, name)).find(existsSync);
  if (!file) throw new Error("Crie .env.staging.local a partir de .env.staging.example.");
  const local = parseEnv(readFileSync(file, "utf8"));
  const api = validateStagingUrl(local.API_URL);
  const env = { ...environment, ...local, API_URL: api, NODE_ENV: "development" };
  delete env.NEXT_PUBLIC_API_URL;
  return env;
}

if (require.main === module) {
  try {
    const env = stagingEnvironment(process.cwd());
    if (process.argv.includes("--check")) console.log("Perfil de homologação validado: API exclusiva em loopback.");
    else {
      const next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", env.STAGING_FRONTEND_PORT || "3000"], { env, stdio: "inherit" });
      for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => next.kill(signal));
      next.on("exit", code => { process.exitCode = code ?? 1; });
      next.on("error", () => { process.exitCode = 1; });
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateStagingUrl, stagingEnvironment };

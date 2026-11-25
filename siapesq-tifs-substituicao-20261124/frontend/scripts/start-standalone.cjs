const { cpSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawn } = require("node:child_process");
process.env.NODE_ENV = "production";
require("@next/env").loadEnvConfig(process.cwd());
const { getProductionApiUrl } = require("../config/api-url");
getProductionApiUrl();
const root = join(process.cwd(), ".next", "standalone");
if (!existsSync(join(root, "server.js"))) throw new Error("Execute npm run build antes de iniciar.");
for (const [source, target] of [["public", "public"], [".next/static", ".next/static"], ["config/cog-manifest.json", "config/cog-manifest.json"]]) {
  cpSync(join(process.cwd(), source), join(root, target), { recursive: true });
}
const server = spawn(process.execPath, [join(root, "server.js")], {
  stdio: "inherit", env: { ...process.env, HOSTNAME: process.env.SIAPESQ_HOST || "127.0.0.1" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("error", () => { process.exitCode = 1; });
server.on("exit", code => { process.exitCode = code ?? 1; });

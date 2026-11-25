const { cpSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");
const output = join(root, "build");
rmSync(output, { recursive: true, force: true });

const compiler = require.resolve("typescript/bin/tsc");
const result = spawnSync(process.execPath, [compiler], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const destination = join(output, "templates");
mkdirSync(destination, { recursive: true });
for (const template of ["verificar_usuario.html", "password-reset.html", "password-changed.html"]) {
  const source = join(root, "src", "templates", template);
  if (!existsSync(source)) throw new Error(`Template não encontrado: ${source}`);
  cpSync(source, join(destination, template));
}

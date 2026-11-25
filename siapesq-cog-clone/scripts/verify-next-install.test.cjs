const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { verifyNextInstall } = require("./verify-next-install.cjs");

function createProject(lockedVersion, installedVersion) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siapesq-next-"));
  const nextDirectory = path.join(projectRoot, "node_modules", "next");
  fs.mkdirSync(nextDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, "package-lock.json"),
    JSON.stringify({
      lockfileVersion: 3,
      packages: { "node_modules/next": { version: lockedVersion } },
    }),
  );
  fs.writeFileSync(
    path.join(nextDirectory, "package.json"),
    JSON.stringify({ name: "next", version: installedVersion }),
  );
  return projectRoot;
}

test("aceita a versão do Next registrada no lockfile", (t) => {
  const projectRoot = createProject("14.2.35", "14.2.35");
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assert.deepEqual(verifyNextInstall(projectRoot), {
    lockedVersion: "14.2.35",
    installedVersion: "14.2.35",
  });
});

test("rejeita uma instalação do Next divergente do lockfile", (t) => {
  const projectRoot = createProject("14.2.35", "15.5.27");
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assert.throws(
    () => verifyNextInstall(projectRoot),
    /instalada 15\.5\.27, lockfile 14\.2\.35/,
  );
});

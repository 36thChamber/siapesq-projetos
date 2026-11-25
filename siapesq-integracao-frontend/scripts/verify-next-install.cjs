const fs = require("node:fs");
const path = require("node:path");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getNextVersions(projectRoot) {
  const lockfile = readJson(path.join(projectRoot, "package-lock.json"));
  const lockedVersion = lockfile.packages?.["node_modules/next"]?.version;

  if (!lockedVersion) {
    throw new Error(
      "package-lock.json não contém uma versão travada do Next.js.",
    );
  }

  let installedVersion;
  try {
    installedVersion = readJson(
      path.join(projectRoot, "node_modules", "next", "package.json"),
    ).version;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error("Next.js não está instalado. Execute `npm install`.");
    }
    throw error;
  }

  return { lockedVersion, installedVersion };
}

function verifyNextInstall(projectRoot = process.cwd()) {
  const { lockedVersion, installedVersion } = getNextVersions(projectRoot);

  if (installedVersion !== lockedVersion) {
    throw new Error(
      `Versão do Next.js inconsistente: instalada ${installedVersion}, ` +
        `lockfile ${lockedVersion}. Execute \`npm install\` antes de iniciar o projeto.`,
    );
  }

  return { lockedVersion, installedVersion };
}

if (require.main === module) {
  try {
    const { installedVersion } = verifyNextInstall();
    console.log(
      `Next.js ${installedVersion} validado com o package-lock.json.`,
    );
  } catch (error) {
    console.error(`Falha na validação das dependências: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { getNextVersions, verifyNextInstall };

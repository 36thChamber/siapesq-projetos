const { spawn } = require("node:child_process");
const { getProductionApiUrl } = require("../config/api-url");

try {
  getProductionApiUrl();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const server = spawn(process.execPath, ["server.js"], {
  stdio: "inherit",
  env: process.env,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("error", (error) => {
  console.error("Não foi possível iniciar o servidor Next.js:", error.message);
  process.exitCode = 1;
});

server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

import "dotenv/config";
import { Server } from "node:http";

import ORM from "./orm/sequelize";
import {
  createGracefulShutdown,
  registerProcessHandlers,
  runBootstrap,
} from "./process-handlers";

interface RuntimeResources {
  server?: Server;
  orm?: ORM;
}

const runtime: RuntimeResources = {};
const shutdown = createGracefulShutdown(() => runtime);

registerProcessHandlers(process, shutdown);

async function bootstrap(): Promise<void> {
  // O import dinamico garante que os handlers de processo sejam registrados
  // antes da avaliacao do App e de suas dependencias.
  const { default: App } = require("./app") as typeof import("./app");
  const port = process.env.PORT || 3001;
  const app = new App();

  if (!app.orm) {
    throw new Error("ORM not initialized");
  }

  runtime.orm = app.orm;
  await app.orm.init();

  runtime.server = app.server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

void runBootstrap(bootstrap, shutdown);

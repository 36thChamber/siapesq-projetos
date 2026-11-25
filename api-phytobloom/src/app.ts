import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import pino from "pino-http";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";

import ORM from "./orm/sequelize";
import router from "./routes/router";

const swaggerPath = path.join(process.cwd(), "docs", "openapi-bundled.yaml");

const swaggerDocument = yaml.load(
  fs.readFileSync(swaggerPath, "utf8"),
) as object;

export default class App {
  server: express.Application;
  orm?: ORM;

  constructor() {
    this.server = express();
    this.server.set("trust proxy", 2);

    this.middlewares();
    this.routes();

    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      this.orm = new ORM(databaseUrl);
    }
  }

  private middlewares() {
    this.server.use(express.json({ limit: "50mb" }));

    this.server.use(cors());

    this.server.use(
      pino({
        level: "info",
        timestamp: true,
        enabled: true,
      }),
    );

    this.server.get("/docs/openapi.json", (_req, res) => {
      return res.status(200).json(swaggerDocument);
    });

    this.server.use(
      "/docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument),
    );
  }

  private routes() {
    this.server.get("/health", (_req, res) => {
      return res.status(200).json({ status: "ok" });
    });

    this.server.use("/", router);

    this.server.use("*", (_req, res) => {
      return res.redirect("/docs");
    });
  }
}

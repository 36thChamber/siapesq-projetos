import express from "express";
import fs from "fs";
import path from "path";
import pino from "pino-http";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";

import ORM from "./orm/sequelize";
import router from "./routes/router";
import { corsMiddleware } from "./middlewares/cors";
import { paginationMiddleware } from "./middlewares/pagination";
import { errorHandler, sanitizeBody } from "./middlewares/error-handler";

const bundledPath = path.join(process.cwd(), "docs", "openapi-bundled.yaml");
const sourcePath  = path.join(process.cwd(), "docs", "openapi.yaml");

const swaggerDocument = yaml.load(
  fs.readFileSync(fs.existsSync(bundledPath) ? bundledPath : sourcePath, "utf8"),
) as object;

export default class App {
  server: express.Application;
  orm?: ORM;

  constructor() {
    this.server = express();

    this.middlewares();
    this.routes();

    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      this.orm = new ORM(databaseUrl);
    }
  }

  private middlewares() {
    // Body parser com limite de 50mb
    this.server.use(express.json({ limit: "50mb" }));

    // CORS configurável por ambiente
    this.server.use(corsMiddleware);

    // Logger estruturado com pino – agora com sanitização do corpo da requisição
    this.server.use(
      pino({
        level: "info",
        timestamp: true,
        enabled: true,
        serializers: {
          req: (req) => ({
            ...req,
            body: sanitizeBody(req.body),
          }),
        },
      })
    );

    // Middleware de paginação (aplica-se a todas as rotas com query)
    this.server.use(paginationMiddleware);

    // Swagger UI para documentação OpenAPI
    this.server.use(
      "/docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument),
    );
  }

  private routes() {
    // Health check
    this.server.get("/health", (_req, res) => {
      return res.status(200).json({ status: "ok" });
    });

    // Rotas da API
    this.server.use("/", router);

    // Fallback: retorna 404 JSON em vez de HTML
    this.server.use("*", (_req, res) => {
      console.log("🔴 FALLBACK 404 ACIONADO para:", _req.path);
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Rota não encontrada",
          details: [],
          traceId: "unknown"
        }
      });
    });

    // ⚠️ MIDDLEWARE DE ERRO – DEVE SER O ÚLTIMO
    this.server.use(errorHandler);
  }
}
import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import pino from "pino-http";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";

import ORM from "./orm/sequelize";
import router from "./routes/router";
import errorHandler from "./middlewares/error-handler";
import { serializeSafeRequest } from "./utils/http-request-serializer";

const swaggerPath = path.join(process.cwd(), "docs", "openapi-bundled.yaml");

const swaggerDocument = yaml.load(
  fs.readFileSync(swaggerPath, "utf8"),
) as object;

export const RENDER_TRUSTED_PROXY_HOPS = 2;

export default class App {
  server: express.Application;
  orm?: ORM;

  constructor() {
    this.server = express();

    // O serviço web público do Render recebe tráfego via Cloudflare e load balancer.
    // Express percorre X-Forwarded-For da aplicação para fora; confie só nesses dois saltos.
    this.server.set("trust proxy", RENDER_TRUSTED_PROXY_HOPS);

    this.middlewares();
    this.routes();
    this.errorHandler();

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
        serializers: { req: serializeSafeRequest },
      }),
    );

    this.server.use(
      "/docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument),
    );
  }

  //  private middlewares() {
  //   this.server.use(express.json({ limit: "50mb" }));

  //   // CORS restrito às origens conhecidas do frontend.
  //   // Configure em CORS_ALLOWED_ORIGINS (separadas por vírgula).
  //   // Ex: CORS_ALLOWED_ORIGINS=http://localhost:3000,https://api.example.invalid
  //   const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  //     .split(",")
  //     .map((origin) => origin.trim())
  //     .filter(Boolean);

  //   this.server.use(
  //     cors({
  //       origin: (origin, callback) => {
  //         // Permite requisições sem Origin (curl, Postman, server-to-server)
  //         if (!origin) return callback(null, true);

  //         if (allowedOrigins.includes(origin)) {
  //           return callback(null, true);
  //         }

  //         return callback(new Error("Origem não permitida pelo CORS"));
  //       },
  //       credentials: true,
  //     }),
  //   );

  //   this.server.use(
  //     pino({
  //       level: "info",
  //       timestamp: true,
  //       enabled: true,
  //     }),
  //   );

  //   this.server.use(
  //     "/docs",
  //     swaggerUi.serve,
  //     swaggerUi.setup(swaggerDocument),
  //   );
  // }

  private routes() {
    this.server.get("/health", (_req, res) => {
      return res.status(200).json({ status: "ok" });
    });

    this.server.use("/", router);

    this.server.use("*", (_req, res) => {
      return res.redirect("/docs");
    });
  }

  private errorHandler() {
    this.server.use(errorHandler);
  }
}

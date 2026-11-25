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
import { assertStagingDatabase, isIsolatedStaging, stagingRequests } from "./utils/staging-isolation";
import checa_token from "./middlewares/checa-token";
import checa_admin from "./middlewares/checa-admin";
import asyncHandler from "./middlewares/async-handler";
import { readStagingMail, localMailEnabled } from "./utils/staging-mail";
import PaymentSimulation, { paymentSimulationEnabled } from "./services/payment-simulation";

const swaggerPath = path.join(process.cwd(), "docs", "openapi-bundled.yaml");

const swaggerDocument = yaml.load(
  fs.readFileSync(swaggerPath, "utf8"),
) as object;

export const RENDER_TRUSTED_PROXY_HOPS = 2;

export default class App {
  server: express.Application;
  orm?: ORM;

  constructor() {
    assertStagingDatabase();
    this.server = express();

    // O serviço web público do Render recebe tráfego via Cloudflare e load balancer.
    // Express percorre X-Forwarded-For da aplicação para fora; confie só nesses dois saltos.
    this.server.set("trust proxy", isIsolatedStaging() ? false : RENDER_TRUSTED_PROXY_HOPS);

    this.middlewares();
    this.routes();
    this.errorHandler();

    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      this.orm = new ORM(databaseUrl);
    }
  }

  private middlewares() {
    this.server.use(stagingRequests);
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
    if (paymentSimulationEnabled()) {
      this.server.get("/homologacao/pagamentos/:id", checa_token, asyncHandler(async (req: any, res) => {
        res.set("Cache-Control", "private, no-store").json(await PaymentSimulation.get(req.params.id, req.id_usuario));
      }));
      this.server.post("/homologacao/pagamentos/:id", checa_token, asyncHandler(async (req: any, res) => {
        res.set("Cache-Control", "private, no-store").json(await PaymentSimulation.resolve(req.params.id, req.id_usuario, req.body?.resultado));
      }));
    }
    if (localMailEnabled()) this.server.get("/homologacao/emails", checa_token, checa_admin,
      asyncHandler(async (_req, res) => { res.set("Cache-Control", "private, no-store").json({ messages: await readStagingMail() }); }));
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

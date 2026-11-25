import express from "express";
import cors from "cors";
import pino from "pino-http";
import ORM from "./orm/sequelize";
import swagger_ui from "swagger-ui-express";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
const swagger_document = yaml.load(
  fs.readFileSync(path.join(__dirname, "../docs/swagger.yaml"), "utf8"),
) as object;
import v1_router from "./routes/v1/router";
import v1_router_phyto from "./routes/v1/phytobloom_router/router";
import v1_router_landingPage from "./routes/v1/landingPage_router/router";
import v1_router_siapesq from "./routes/v1/siapesq_router/router";

export default class App {
  server: express.Application;
  orm: ORM;
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();
    const DATABASE_URL = process.env.DATABASE_URL;
    if (DATABASE_URL) {
      this.orm = new ORM(DATABASE_URL);
    }
  }
  middlewares() {
    this.server.use(express.json({ limit: "50mb" }));
    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        // Permite Electron / app://
        if (!origin || origin.startsWith("app://")) {
          return callback(null, true);
        }

        const allowedOrigins = [
          "http://localhost:3000",
          "http://localhost:8888",
          "http://127.0.0.1:8888",
          "https://api.example.invalid",
          "https://api.example.invalid",
        ];

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    };

    // 👇 ISSO AQUI É O QUE NORMALMENTE FALTA
    this.server.use(cors(corsOptions));
    this.server.options("*", cors(corsOptions));

    this.server.use(pino({ level: "info", timestamp: true, enabled: true }));
    this.server.use(
      "/docs",
      swagger_ui.serve,
      swagger_ui.setup(swagger_document),
    );
  }
  routes() {
    this.server.get("/v1/health", (_req, res) => {
      return res.status(200).json({ status: "ok" });
    });

    this.server.use("/v1", v1_router);
    this.server.use("/v1/phytoBloom", v1_router_phyto);
    this.server.use("/v1/siapesq", v1_router_siapesq);

    this.server.use("/v1/landingPage", v1_router_landingPage);
    this.server.use("*", (req, res) => res.redirect("/docs"));
  }
}

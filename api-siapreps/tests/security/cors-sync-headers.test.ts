import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { corsMiddleware } from "../../src/middlewares/cors";

describe("CORS dos contratos de sincronização", () => {
  it("expõe Idempotent-Replay e ETag para o cliente browser", async () => {
    const app = express();
    app.use(corsMiddleware);
    app.get("/sync-test", (_req, res) => res.set("Idempotent-Replay", "true").set("ETag", '"2"').json({ ok: true }));

    const response = await request(app).get("/sync-test");
    expect(response.headers["access-control-expose-headers"]).toContain("Idempotent-Replay");
    expect(response.headers["access-control-expose-headers"]).toContain("ETag");
  });
});

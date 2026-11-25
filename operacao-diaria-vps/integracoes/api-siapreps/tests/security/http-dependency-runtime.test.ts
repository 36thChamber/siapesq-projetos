import request from "supertest";
import { describe, expect, it } from "vitest";
import App from "../../src/app";

describe("Express e Swagger após atualização de dependências", () => {
  const app = new App().server;

  it("mantém health check e trust proxy desativado", async () => {
    expect(app.get("trust proxy")).toBe(false);
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("serve a documentação Swagger a partir do YAML existente", async () => {
    const response = await request(app).get("/docs/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("swagger-ui");
  });

  it("rejeita JSON inválido antes do roteamento", async () => {
    const response = await request(app)
      .post("/health")
      .set("Content-Type", "application/json")
      .send("{");
    expect(response.status).toBe(400);
  });
});

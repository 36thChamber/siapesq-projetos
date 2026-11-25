import { describe, expect, it } from "vitest";
import request from "supertest";
import App from "../src/app";

describe("Swagger UI", () => {
  const app = new App().server;

  it("serve a interface e o OpenAPI com fluxos de autenticação testáveis", async () => {
    const ui = await request(app).get("/docs/");
    expect(ui.status).toBe(200);
    expect(ui.text).toContain("Swagger UI");

    const response = await request(app).get("/docs/openapi.json");
    expect(response.status).toBe(200);
    const doc = response.body;
    expect(doc.servers).toEqual([{ url: "/", description: expect.any(String) }]);
    expect(doc.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
    expect(doc.paths["/usuarios/login"].post.security).toEqual([]);
    expect(doc.paths["/usuarios/redefinir-senha"].post.requestBody.content["application/json"]).toBeDefined();
    expect(doc.paths["/verificarEmail"].get.security).toEqual([{ emailVerificationToken: [] }]);
    expect(doc.paths["/verificarEmail/enviar"].post.security).toEqual([{ bearerAuth: [] }]);
  });
});

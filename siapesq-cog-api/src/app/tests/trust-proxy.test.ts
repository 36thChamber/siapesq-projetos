import { afterEach, describe, expect, it } from "vitest";
import App, { RENDER_TRUSTED_PROXY_HOPS } from "../../app";

describe("proxy confiável do Render", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("configura dois saltos antes de instalar rotas e limitadores", () => {
    delete process.env.DATABASE_URL;
    const app = new App();

    expect(RENDER_TRUSTED_PROXY_HOPS).toBe(2);
    expect(app.server.get("trust proxy")).toBe(2);
  });
});

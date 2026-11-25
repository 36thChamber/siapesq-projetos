import { describe, expect, it } from "vitest";

import requireContaAtiva from "../src/middlewares/require-conta-ativa";
import alertasRouter from "../src/routes/alertas-routes";

describe("rotas de alertas - gate de conta", () => {
  it.each([
    ["get", "/"],
    ["get", "/:id"],
    ["put", "/:id"],
    ["delete", "/:id"],
  ])("protege %s %s com requireContaAtiva", (method, path) => {
    const layer = (alertasRouter as any).stack.find(
      (item: any) => item.route?.path === path && item.route?.methods?.[method],
    );

    expect(layer?.route?.stack).toHaveLength(3);
    expect(layer?.route?.stack[1].handle).toBe(requireContaAtiva);
  });
});

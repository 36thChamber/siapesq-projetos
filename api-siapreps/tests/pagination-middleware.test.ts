import { describe, expect, it, vi } from "vitest";
import { paginationMiddleware } from "../src/middlewares/pagination";

function criarResposta() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
}

describe("paginationMiddleware", () => {
  it("preserva parâmetros próprios da rota e aplica a paginação padrão", () => {
    const req = {
      query: { object_name: "analise.tif" },
      headers: {},
    } as any;
    const res = criarResposta();
    const next = vi.fn();

    paginationMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.query.object_name).toBe("analise.tif");
    expect(req.pagination).toEqual({ limit: 50, offset: 0 });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("continua rejeitando valores inválidos de paginação", () => {
    const req = {
      query: { object_name: "analise.tif", limit: "200" },
      headers: {},
    } as any;
    const res = criarResposta();
    const next = vi.fn();

    paginationMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "INVALID_PAGINATION" }),
      }),
    );
  });
});

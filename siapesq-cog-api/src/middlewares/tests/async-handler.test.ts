import { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import asyncHandler from "../async-handler";

describe("asyncHandler", () => {
  it("encaminha rejeicoes assincronas para o middleware de erro", async () => {
    const error = new Error("falha assincrona");
    const next = vi.fn();
    const handler = asyncHandler(async () => {
      throw error;
    });

    handler({} as Request, {} as Response, next as NextFunction);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(error));
  });

  it("nao chama next quando o handler resolve com sucesso", async () => {
    const next = vi.fn();
    const handler = asyncHandler(async (_req, res) => {
      res.status(204);
    });
    const res = { status: vi.fn() } as unknown as Response;

    handler({} as Request, res, next as NextFunction);
    await Promise.resolve();

    expect(res.status).toHaveBeenCalledWith(204);
    expect(next).not.toHaveBeenCalled();
  });
});

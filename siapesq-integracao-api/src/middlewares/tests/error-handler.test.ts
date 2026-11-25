import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import errorHandler from "../error-handler";
import httpStatus from "../../consts/http-status-enum";

describe("errorHandler middleware", () => {
  let req: Partial<Request> & { log?: { error: any } };
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: any;
  let statusMock: any;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = {
      log: {
        error: vi.fn(),
      },
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
    next = vi.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("deve responder com 500 Internal Server Error para erros sem status definido", () => {
    const error = new Error("Falha inesperada no banco");

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(httpStatus.INTERNAL_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Internal Server Error",
        message: "Falha inesperada no banco",
        statusCode: 500,
      })
    );
    expect(req.log?.error).toHaveBeenCalledWith(
      { err: error, statusCode: 500 },
      "Falha inesperada no banco"
    );
  });

  it("deve respeitar err.status customizado (ex: 400 Bad Request)", () => {
    const error = {
      status: 400,
      message: "Formato de payload inválido",
    };

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Request Error",
        message: "Formato de payload inválido",
        statusCode: 400,
      })
    );
  });

  it("deve respeitar err.statusCode caso status não esteja definido", () => {
    const error = {
      statusCode: 404,
      message: "Recurso não encontrado",
    };

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Request Error",
        message: "Recurso não encontrado",
        statusCode: 404,
      })
    );
  });

  it("deve tratar erro lançado como string", () => {
    const error = "Erro em formato de texto direto";

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(httpStatus.INTERNAL_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Internal Server Error",
        message: "Erro em formato de texto direto",
        statusCode: 500,
      })
    );
  });

  it("deve ocultar detalhes internos quando NODE_ENV for production", () => {
    process.env.NODE_ENV = "production";
    const error = new Error("Erro em produção");

    errorHandler(error, req as Request, res as Response, next);

    expect(jsonMock).toHaveBeenCalledWith({
      error: "Internal Server Error",
      message: "Erro interno do servidor",
      statusCode: 500,
    });
    expect(req.log?.error).toHaveBeenCalledWith(
      { err: error, statusCode: 500 },
      "Erro em produção",
    );
  });

  it("deve manter mensagens de erros 4xx em produção", () => {
    process.env.NODE_ENV = "production";
    const error = { status: 422, message: "Payload inválido" };

    errorHandler(error, req as Request, res as Response, next);

    expect(jsonMock).toHaveBeenCalledWith({
      error: "Request Error",
      message: "Payload inválido",
      statusCode: 422,
    });
  });

  it("deve converter status inválido para 500", () => {
    const error = { status: 700, message: "Status fora do intervalo" };

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(httpStatus.INTERNAL_ERROR);
  });

  it("deve delegar quando os headers já foram enviados", () => {
    const error = new Error("Falha após início da resposta");
    res.headersSent = true;

    errorHandler(error, req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it("deve exibir stack trace quando NODE_ENV for development", () => {
    process.env.NODE_ENV = "development";
    const error = new Error("Erro em desenvolvimento");

    errorHandler(error, req as Request, res as Response, next);

    const callArgs = jsonMock.mock.calls[0][0];
    expect(callArgs.stack).toBeDefined();
    expect(callArgs.message).toBe("Erro em desenvolvimento");
  });

  it("deve usar console.error caso req.log não esteja disponível", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reqWithoutLog = {} as Request;
    const error = new Error("Erro sem pino log");

    errorHandler(error, reqWithoutLog, res as Response, next);

    expect(consoleSpy).toHaveBeenCalledWith("[errorHandler]", error);
  });
});

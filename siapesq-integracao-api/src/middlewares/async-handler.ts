import { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (
  req: Request | any,
  res: Response,
  next: NextFunction,
) => unknown | Promise<unknown>;

/**
 * Encaminha rejeicoes de handlers assincronos para o middleware global de erro.
 * O Express 4 nao faz esse encaminhamento automaticamente.
 */
export default function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

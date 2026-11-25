import { Request, Response, NextFunction } from "express";
import httpStatus from "../consts/http-status-enum";

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const providedStatus = err?.status ?? err?.statusCode;
  const statusCode =
    Number.isInteger(providedStatus) && providedStatus >= 400 && providedStatus <= 599
      ? providedStatus
      : httpStatus.INTERNAL_ERROR;

  const internalMessage =
    err?.message ||
    (typeof err === "string" ? err : "Erro interno do servidor");

  const isProduction = ["production", "prod"].includes(
    process.env.NODE_ENV?.toLowerCase() ?? "",
  );
  const message =
    isProduction && statusCode >= httpStatus.INTERNAL_ERROR
      ? "Erro interno do servidor"
      : internalMessage;

  if ((req as any).log?.error) {
    (req as any).log.error({ err, statusCode }, internalMessage);
  } else {
    console.error("[errorHandler]", err);
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal Server Error" : "Request Error",
    message,
    statusCode,
    ...(!isProduction && { stack: err?.stack }),
  });
}

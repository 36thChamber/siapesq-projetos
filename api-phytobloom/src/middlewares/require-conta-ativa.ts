import { NextFunction, Request, Response } from "express";
import http_status from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

export default function requireContaAtiva(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const request = req as RequestAutenticado;

  if (request.autenticado_por_api_key) {
    next();
    return;
  }

  // Admins nunca ficam bloqueados pelo gate de conta (TASK#26), espelhando o
  // bypass de is_admin dos use-cases de areas de alerta.
  if (request.is_admin === true) {
    next();
    return;
  }

  // TODO(#15): tornar esta checagem obrigatoria quando o fluxo de
  // confirmacao de e-mail estiver disponivel para usuarios novos.
  if (process.env.REQUIRE_EMAIL_VERIFIED === "true" && !request.user_verify) {
    return res.status(http_status.FORBIDDEN).json({
      message: "email nao confirmado",
      status: http_status.FORBIDDEN,
    });
  }

  if (!request.ativo) {
    return res.status(http_status.FORBIDDEN).json({
      message: "aguardando aprovacao",
      status: http_status.FORBIDDEN,
    });
  }

  next();
}

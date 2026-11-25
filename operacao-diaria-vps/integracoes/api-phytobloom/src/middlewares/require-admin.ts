import { NextFunction, Response } from "express";
import http_status from "../consts/http-status-enum";

/**
 * Middleware de autorização: permite acesso apenas a usuários com is_admin === true.
 * Deve ser usado sempre APÓS o middleware checa_token, que injeta req.is_admin.
 * Retorna 403 Forbidden para qualquer conta que não seja admin.
 */
export default function requireAdmin(
  req: any,
  res: Response,
  next: NextFunction,
) {
  if (!req.is_admin) {
    return res.status(http_status.FORBIDDEN).json({
      message: "Acesso restrito a administradores",
      status: http_status.FORBIDDEN,
    });
  }
  next();
}

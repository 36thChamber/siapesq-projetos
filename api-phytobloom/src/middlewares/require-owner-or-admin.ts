import { NextFunction, Response } from "express";
import http_status from "../consts/http-status-enum";

/**
 * Middleware de autorização: permite acesso apenas ao próprio usuário (owner)
 * ou a um administrador. Compara req.id_usuario com req.params.id.
 * Deve ser usado sempre APÓS o middleware checa_token.
 * Retorna 403 Forbidden para terceiros sem privilégio admin.
 */
export default function requireOwnerOrAdmin(
  req: any,
  res: Response,
  next: NextFunction,
) {
  if (req.is_admin) {
    return next();
  }

  const targetId = Number(req.params.id);
  if (Number(req.id_usuario) === targetId) {
    return next();
  }

  return res.status(http_status.FORBIDDEN).json({
    message: "Acesso negado: voce so pode acessar seus proprios dados",
    status: http_status.FORBIDDEN,
  });
}

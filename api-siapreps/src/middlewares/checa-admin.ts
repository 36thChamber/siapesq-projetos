import { NextFunction, Response } from "express";
import httpStatus from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

export default function checa_admin(
  req: RequestAutenticado,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.auth) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "não autenticado",
      });
    }

    if (!req.auth.administracao) {
      return res.status(httpStatus.FORBIDDEN).json({
        message: "Acesso permitido somente para administradores",
      });
    }

    next();
  } catch (err: any) {
    return res.status(httpStatus.FORBIDDEN).json({
      message: err.message || err,
    });
  }
}

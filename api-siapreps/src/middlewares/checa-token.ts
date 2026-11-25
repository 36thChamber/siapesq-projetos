import { NextFunction, Response } from "express";

import httpStatus from "../consts/http-status-enum";
import AuthServices from "../services/auth-services";
import { RequestAutenticado } from "../types/express-types";

export default function checa_token(
  req: RequestAutenticado,
  res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header) {
      throw {
        message: "header authorization é indefinido",
        status: httpStatus.UNAUTHORIZED,
      };
    }

    const [, token] = header.split(" ");
    if (!token) {
      throw {
        message: "token é indefinido",
        status: httpStatus.UNAUTHORIZED,
      };
    }

    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      throw {
        message: "JWT_SECRET não definido",
        status: httpStatus.INTERNAL_ERROR,
      };
    }

    const usuario = AuthServices.decoda_jwt_token(token, segredo);
    const { id } = usuario;

  
    req.auth = {
      id_usuario: Number(id),
      administracao: !!usuario.administracao,
      session_id: usuario.session_id,
    };

  
    req.id_usuario = req.auth.id_usuario;
    req.administracao = req.auth.administracao;
    req.session_id = req.auth.session_id;

    next();
  } catch (err: any) {
    // jsonwebtoken lança JsonWebTokenError/TokenExpiredError/NotBeforeError sem
    // `status`; um token inválido ou expirado é falha de autenticação, não 500.
    const erroDeToken = [
      "JsonWebTokenError",
      "TokenExpiredError",
      "NotBeforeError",
    ].includes(err?.name);
    const statusCode = erroDeToken
      ? httpStatus.UNAUTHORIZED
      : err.status || httpStatus.INTERNAL_ERROR;
    const message = erroDeToken ? "Token inválido ou expirado" : err.message;
    return res.status(statusCode).json({ message, status: statusCode });
  }
}

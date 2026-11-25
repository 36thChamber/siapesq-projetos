import { NextFunction, Response } from "express";
import http_status from "../consts/http-status-enum";
import AuthServices from "../services/auth-services";
import Usuarios from "../models/Usuarios";

export default async function checa_token(req: any, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header) {
      throw {
        message: "header authorization e indefinido",
        status: http_status.UNAUTHORIZED,
      };
    }

    const [scheme, token, extra] = header.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
      throw {
        message: "authorization deve usar o formato Bearer <token>",
        status: http_status.UNAUTHORIZED,
      };
    }

    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      throw {
        message: "JWT_SECRET nao definido",
        status: http_status.INTERNAL_ERROR,
      };
    }

    const payload = AuthServices.decoda_jwt_token(token, segredo);

    // Carrega is_admin do banco a cada request para garantir que
    // remoções de privilégio tenham efeito imediato, sem depender
    // da expiração do JWT.
    const usuario = await Usuarios.findByPk(payload.id, {
      attributes: ["id", "is_admin", "ativo", "user_verify"],
    });

    if (!usuario) {
      throw {
        message: "Usuario do token nao encontrado",
        status: http_status.UNAUTHORIZED,
      };
    }

    req.id_usuario = usuario.id;
    req.is_admin = usuario.is_admin;
    req.ativo = usuario.ativo;
    req.user_verify = usuario.user_verify;
    next();
  } catch (err: any) {
    const statusCode = err.status || http_status.INTERNAL_ERROR;
    return res.status(statusCode).json({
      message: err.message || "Token invalido",
      status: statusCode,
    });
  }
}

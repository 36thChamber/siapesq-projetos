import { NextFunction, Request, Response } from "express";

import httpStatus from "../consts/http-status-enum";
import Usuarios from "../models/Usuarios";
import { TipoUsuario } from "../models/enums/tipoUsuarioEnum";
import { RequestAutenticado } from "../types/express-types";

export default async function checa_admin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id_usuario } = req as RequestAutenticado;

  if (!id_usuario) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      error: "Unauthorized",
      message: "Usuário não autenticado.",
    });
  }

  try {
    const usuario = await Usuarios.findByPk(id_usuario, {
      attributes: ["tipo_usuario"],
    });

    if (!usuario) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        error: "Unauthorized",
        message: "Usuário autenticado não encontrado.",
      });
    }

    if (usuario.tipo_usuario !== TipoUsuario.ADMIN) {
      return res.status(httpStatus.FORBIDDEN).json({
        error: "Forbidden",
        message: "Apenas administradores podem realizar esta ação.",
      });
    }

    return next();
  } catch (err) {
    console.error("Erro ao verificar permissões do usuário:", err);
    return res.status(httpStatus.INTERNAL_ERROR).json({
      error: "Internal Server Error",
      message: "Ocorreu um erro interno ao verificar as permissões do usuário.",
    });
  }
}

import { Response, NextFunction } from "express";
import { RequestAutenticado } from "../../types/express-types";
import http_status from "../../consts/http-status-enum";
import UsuariosAtivosServices from "../usuarios-ativos-services";
import { paginatedResponse } from "../../utils/response-utils";

export default class UsuariosAtivosHttpService {
  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await UsuariosAtivosServices.list({ limit, offset });
      return res.status(http_status.OK).json(
        paginatedResponse(result.usuariosAtivos, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async getId(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);

      // Cada usuário consulta o próprio registro; administradores consultam qualquer um.
      if (!req.auth!.administracao && id !== req.auth!.id_usuario) {
        return res.status(http_status.NOT_FOUND).json({
          message: "recurso não encontrado",
        });
      }

      const usuario = await UsuariosAtivosServices.get(id);
      return res.status(http_status.OK).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id_usuario, tipo_assinatura, ativo, data_criacao, data_fim } = req.body;

      // O cadastro cria o registro do próprio usuário. Apenas administradores
      // podem criar registro ativo para outra conta.
      if (
        id_usuario !== undefined &&
        id_usuario !== null &&
        Number(id_usuario) !== req.auth!.id_usuario &&
        !req.auth!.administracao
      ) {
        return res.status(http_status.FORBIDDEN).json({
          message: "Acesso negado: id_usuario diferente do usuário autenticado",
        });
      }

      const usuario = await UsuariosAtivosServices.create({
        id_usuario,
        tipo_assinatura,
        ativo,
        data_criacao,
        data_fim,
      });
      return res.status(http_status.OK).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const usuario = await UsuariosAtivosServices.update(req.body);
      return res.status(http_status.OK).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const usuario = await UsuariosAtivosServices.delete(req.body);
      return res.status(http_status.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }
}
import { Request, Response } from "express";
import http_status from "../consts/http-status-enum";
import AuthServices from "../services/auth-services";
import { RequestAutenticado } from "../types/express-types";
import services from "../services/usuarios-services";

function parseId(value: string) {
  const id = Number(value);
  if (Number.isNaN(id)) {
    throw { status: http_status.BAD_REQUEST, message: "id invalido" };
  }
  return id;
}

function parsePagination(query: Request["query"]) {
  const { limit, offset } = query;
  if (limit && typeof limit !== "string") {
    throw {
      status: http_status.BAD_REQUEST,
      message: "Parametros invalidos: limit e offset devem ser numeros",
    };
  }
  if (offset && typeof offset !== "string") {
    throw {
      status: http_status.BAD_REQUEST,
      message: "Parametros invalidos: limit e offset devem ser numeros",
    };
  }

  return {
    limit: limit ? Number(limit) : 10000,
    offset: offset ? Number(offset) : 0,
  };
}

export default class UsuariosController {
  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;
      const usuario = await services.login({ email, senha });
      return res.status(http_status.OK).json(usuario);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const lista = await services.list(parsePagination(req.query));
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async getId(req: RequestAutenticado, res: Response) {
    try {
      const usuario = await services.get(parseId(req.params.id));
      return res.status(http_status.OK).json(usuario);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async create(req: Request, res: Response) {
    try {
      // is_admin não é desestruturado — não pode ser promovido via cadastro
      const { nome, email, senha, documento, telefone } = req.body;
      const usuario = await services.create({
        nome,
        email,
        senha,
        documento,
        telefone,
      });

      return res.status(http_status.CREATED).json(usuario);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const atualizaStatusConta =
        Object.prototype.hasOwnProperty.call(req.body, "ativo") ||
        Object.prototype.hasOwnProperty.call(req.body, "user_verify");

      if (atualizaStatusConta && !req.is_admin) {
        return res.status(http_status.FORBIDDEN).json({
          message: "Apenas administradores podem alterar ativo ou user_verify",
          status: http_status.FORBIDDEN,
        });
      }

      const usuario = await services.update(req.body, parseId(req.params.id));
      return res.status(http_status.OK).json(usuario);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async novoToken(req: RequestAutenticado, res: Response) {
    try {
      const usuario = await services.get(req.id_usuario);
      const segredo = process.env.JWT_SECRET;
      if (!segredo) {
        throw {
          message: "JWT_SECRET nao setado",
          status: http_status.INTERNAL_ERROR,
        };
      }

      const token = AuthServices.gera_jwt_token({ id: usuario.id }, segredo);

      return res.status(http_status.OK).json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        ativo: usuario.ativo,
        user_verify: usuario.user_verify,
        documento: usuario.documento,
        telefone: usuario.telefone,
        token,
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response) {
    try {
      const usuario = await services.delete(parseId(req.params.id));
      return res.status(http_status.OK).json(usuario);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}

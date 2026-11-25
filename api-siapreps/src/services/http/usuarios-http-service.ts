import { Response, NextFunction } from "express";
import httpStatus from "../../consts/http-status-enum";
import UsuariosServices from "../usuarios-services";
import AuthServices from "../auth-services";
import { RequestAutenticado } from "../../types/express-types";
import { paginatedResponse } from "../../utils/response-utils";

export default class UsuariosHttpService {
  async solicitarRecuperacaoSenha(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      await UsuariosServices.solicitarRecuperacaoSenha(req.body);
      return res.status(httpStatus.OK).json({ message: "Email de recuperacao enviado" });
    } catch (err) {
      next(err);
    }
  }

  async redefinirSenha(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      await UsuariosServices.redefinirSenha(req.body);
      return res.status(httpStatus.OK).json({ message: "Senha atualizada com sucesso" });
    } catch (err) {
      next(err);
    }
  }

  async login(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { email, senha } = req.body;
      const usuario = await UsuariosServices.login({ email, senha });
      return res.status(httpStatus.OK).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await UsuariosServices.list({ limit, offset });
      return res.status(httpStatus.OK).json(
        paginatedResponse(result.usuarios, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async getId(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        throw { status: httpStatus.BAD_REQUEST, message: "Parametro id invalido" };
      }

      // Cada usuário consulta apenas os próprios dados; administradores consultam qualquer um.
      // Terceiros recebem 404 para não revelar a existência da conta.
      if (!req.auth!.administracao && id !== req.auth!.id_usuario) {
        return res.status(httpStatus.NOT_FOUND).json({
          message: "recurso não encontrado",
        });
      }

      const usuario = await UsuariosServices.get(id);
      return res.status(httpStatus.OK).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { email, senha, documento, insc_capt_portos, telefone, nome } = req.body;
      const usuario = await UsuariosServices.create({
        email,
        senha,
        documento,
        insc_capt_portos,
        telefone,
        nome,
      });
      return res.status(httpStatus.CREATED).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const usuario = await UsuariosServices.update(req.body, req.id_usuario!);
      return res.status(httpStatus.OK).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async atualizarStatus(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw { status: httpStatus.BAD_REQUEST, message: "Parametro id invalido" };
      }
      const usuario = await UsuariosServices.atualizarStatus(id, req.body);
      return res.status(httpStatus.OK).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async novoToken(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const usuario = await UsuariosServices.get(req.id_usuario!);
      const segredo = process.env.JWT_SECRET;
      if (!segredo) {
        throw { status: httpStatus.INTERNAL_ERROR, message: "JWT_SECRET nao setado" };
      }
      const token = AuthServices.gera_jwt_token({ id: usuario.id, administracao: usuario.administracao }, segredo);
      return res.status(httpStatus.OK).json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        documento: usuario.documento,
        insc_capt_portos: usuario.insc_capt_portos,
        telefone: usuario.telefone,
        token,
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        throw { status: httpStatus.BAD_REQUEST, message: "Parametro id invalido" };
      }

      // Cada usuário só pode excluir a própria conta.
      if (id !== req.id_usuario) {
        return res.status(httpStatus.FORBIDDEN).json({
          message: "Acesso negado: voce so pode excluir a propria conta",
        });
      }

      await UsuariosServices.delete(id);
      return res.status(httpStatus.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }
}
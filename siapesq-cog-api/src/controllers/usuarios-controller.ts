import { Request, Response } from "express";
import { RequestAutenticado } from "../types/express-types";
import httpStatus from "../consts/http-status-enum";
import UsuariosService from "../services/usuarios-services";
import { serializeSafeError } from "../utils/diagnostic-error";

export default class UsuariosController {
  async login(req: Request, res: Response) {
    try {
      const usuario = await UsuariosService.login(req.body);
      return res.status(httpStatus.OK).json(usuario);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json({
        message: err.message,
        ...(err.code ? { code: err.code } : {}),
      });
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const { limit, offset } = req.query;

      const lista = await UsuariosService.listar({
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0,
      });

      return res.status(httpStatus.OK).json(lista);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async getId(req: RequestAutenticado, res: Response) {
    try {
      const usuario = await UsuariosService.buscarPorId(
        {
          id_usuario: req.params.id,
        },
        req.id_usuario
      );

      return res.status(httpStatus.OK).json(usuario);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const usuario = await UsuariosService.criar(req.body);
      return res.status(httpStatus.CREATED).json(usuario);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const usuario = await UsuariosService.atualizar(
        { id_usuario: req.id_usuario },
        req.body
      );

      return res.status(httpStatus.OK).json(usuario);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response) {
    try {
      const usuario = await UsuariosService.deletar({
        id_usuario: req.params.id,
      });

      return res.status(httpStatus.OK).json(usuario);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      await UsuariosService.esqueciSenha({
        email: req.body?.email,
      });

      return res.status(httpStatus.OK).json({
        message:
          "Se o email estiver em nosso banco de dados, você receberá um link para redefinir sua senha.",
      });
    } catch (err: any) {
      if (err.status !== httpStatus.BAD_REQUEST) {
        req.log?.error(serializeSafeError(err), "falha em forgot-password");
        return res.status(httpStatus.OK).json({
          message:
            "Se o email estiver em nosso banco de dados, você receberá um link para redefinir sua senha.",
        });
      }

      return res.status(err.status).json(err);
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      await UsuariosService.resetarSenha(req.body);

      return res.status(httpStatus.OK).json({
        message: "Senha alterada com sucesso.",
      });
    } catch (err: any) {
      if ([400, 401, 404].includes(err.status)) {
        return res.status(err.status).json({ message: err.message });
      }
      req.log?.error({ kind: err instanceof Error ? err.name : "erro desconhecido" }, "falha em reset-password");
      return res.status(httpStatus.INTERNAL_ERROR).json({ message: "Não foi possível redefinir a senha." });
    }
  }

  async sendVerificationEmail(req: Request, res: Response) {
    const message = "Se o e-mail estiver cadastrado e pendente, enviaremos as instruções.";
    try {
      if (!req.body || Array.isArray(req.body) ||
          Object.keys(req.body).some((key) => key !== "email")) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "E-mail inválido." });
      }
      await UsuariosService.enviarVerificacaoEmail({
        email: req.body.email,
      });

      return res.status(httpStatus.OK).json({ message });
    } catch (err: any) {
      if (err.status === httpStatus.BAD_REQUEST) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "E-mail inválido." });
      }
      return res.status(httpStatus.OK).json({ message });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const token = req.method === "POST" ? req.body?.token : req.query.token as string;

      await UsuariosService.confirmarEmail({ token });

      return res.status(httpStatus.OK).json({
        verified: true,
        message: "E-mail verificado com sucesso.",
      });
    } catch (err: any) {
      const status = err.status ?? httpStatus.INTERNAL_ERROR;

      const mensagem =
        err.code === "EMAIL_TOKEN_EXPIRED"
          ? "Link expirado. Solicite um novo e-mail de verificação."
          : status === httpStatus.UNAUTHORIZED
          ? "Link inválido ou expirado."
          : "Não foi possível confirmar o e-mail. Tente novamente mais tarde.";

      return res.status(status).json({
        verified: false,
        message: mensagem,
        ...(err.code === "EMAIL_TOKEN_EXPIRED" ? { code: err.code } : {}),
      });
    }
  }

  async novoToken(req: RequestAutenticado, res: Response) {
    try {
      const result = await UsuariosService.atualizarToken({
        id_usuario: req.id_usuario,
      });

      return res.status(httpStatus.OK).json(result);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }
}

import { Request, Response } from "express";
import { RequestAutenticado } from "../../types/express-types";
import http_status from "../../consts/http-status-enum";
import services from "../../services/usuarios_services-siapesq";
import AuthServices from "../../services/auth-services";
import ListandoUsuarios from "../../use-cases/siapesq_use-cases/Usuarios/get-Usuario";
import DeletarUsuarioUseCase from "../../use-cases/siapesq_use-cases/Usuarios/delete-Usuario";
import usuarios from "../../models/siapesq/Usuarios";
import * as path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';

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
      const { limit, offset } = req.query as {
        limit?: string;
        offset?: string;
      };

      const limitNum = limit ? parseInt(limit) : 10000;
      const offsetNum = offset ? parseInt(offset) : 0;

      if (isNaN(limitNum) || isNaN(offsetNum)) {
        throw {
          status: http_status.BAD_REQUEST,
          message: "Parâmetros inválidos: limit e offset devem ser números",
        };
      }

      const query = { limit: limitNum, offset: offsetNum };
      await ListandoUsuarios.valida(query);
      const lista = await ListandoUsuarios.executa(query);
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async getId(req: RequestAutenticado, res: Response) {
    try {
      const id = req.params.id;
      const usuario = await services.get(id);
      return res.status(http_status.OK).json(usuario);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const {
        nome,
        email,
        senha,
        contato,
        cpf,
        titulo_cientifico,
        tipo_usuario,
        email_verificado,
        ultimo_acesso,
      } = req.body;
      const usuario = await services.create({
        nome,
        email,
        senha,
        contato,
        cpf,
        tipo_usuario,
        titulo_cientifico,
        email_verificado,
        ultimo_acesso,
      });
      return res.status(http_status.OK).json(usuario);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async update(req: RequestAutenticado, res: Response) {
    try {
      const usuario = await services.update(req.body, req.body.id_usuario);
      return res.status(http_status.OK).json(usuario);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async novoToken(req: RequestAutenticado, res: Response) {
    try {
      const usuario = await services.get(req.id_usuario);
      const id = usuario.id_usuario;
      const segredo = process.env.JWT_SECRET;
      if (!segredo) {
        throw {
          message: "JWT_SECRET nao setado",
          status: http_status.INTERNAL_ERROR,
        };
      }
      const novoToken = AuthServices.gera_jwt_token({ id }, segredo);

      const novoAcesso = await usuarios.update(
        { ultimo_acesso: new Date() },
        { where: { id_usuario: id } }
      );

      return res.status(http_status.OK).json({
        id_usuario: id,
        nome: usuario.nome,
        email: usuario.email,
        contato: usuario.contato,
        cpf: usuario.cpf,
        titulo_cientifico: usuario.titulo_cientifico,
        ultimo_acesso: novoAcesso,
        criado_em: usuario.criado_em,
        atualizado_em: usuario.atualizado_em,
        deletado_em: usuario.deletado_em,
        token: novoToken,
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await DeletarUsuarioUseCase.valida({ id_usuario: (id) });
      const usuario = DeletarUsuarioUseCase.executa({
        id_usuario: (id),
      });
      return res.status(http_status.OK).json(usuario);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      await services.forgotPassword({ email });

      return res.status(http_status.OK).json({
        message: "Se o email estiver em nosso banco de dados, você receberá um link para redefinir sua senha."
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      if (statusCode !== http_status.BAD_REQUEST) {
        return res.status(http_status.OK).json({
          message: "Se o email estiver em nosso banco de dados, você receberá um link para redefinir sua senha."
        });
      }
      return res.status(statusCode).json(err);
    }
  }
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, novaSenha } = req.body;

      await services.resetPassword({ token, novaSenha });

      return res.status(http_status.OK).json({
        message: "Senha alterada com sucesso."
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;

      return res.status(statusCode).json(err);
    }
  }
  async renderResetPasswordForm(req: Request, res: Response) {
    const token = req.query.token as string;
    if (!token || typeof token !== 'string') {
      return res.status(http_status.BAD_REQUEST).send("Token inválido ou não fornecido.");
    }
    try {
      const segredo = process.env.JWT_SECRET;
      if (!segredo) {
        return res.status(http_status.INTERNAL_ERROR).send("Erro interno de configuração.");
      }
      AuthServices.decoda_jwt_token(token, segredo);

      const templatePath = path.join(process.cwd(), 'src', 'templates', 'reset-password-form.html');
      const source = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(source);

      const htmlContent = template({ token: token });

      return res.status(http_status.OK).send(htmlContent);

    } catch (err: any) {
      const statusCode = (err instanceof TokenExpiredError || err instanceof JsonWebTokenError)
        ? http_status.UNAUTHORIZED
        : http_status.INTERNAL_ERROR;

      if (err instanceof TokenExpiredError) {
        return res.status(statusCode).send("O link expirou. Solicite um novo e-mail de redefinição.");
      }

      return res.status(statusCode).send("Link de redefinição inválido.");
    }
  }
  async sendVerificationEmail(req: Request, res: Response) {
    try {
      const { id_usuario, email, nome } = req.body;

      if (!id_usuario || !email || !nome) {
        throw {
          status: http_status.BAD_REQUEST,
          message: "Dados do usuário incompletos para envio de e-mail de verificação.",
        };
      }

      await services.sendVerificationEmail({ id_usuario, email, nome });

      return res.status(http_status.OK).json({
        message: "E-mail de verificação enviado com sucesso. Verifique sua caixa de entrada."
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async verifyEmail(req: Request, res: Response) {
    try {
      const token = req.query.token as string;

      await services.verifyEmail({ token });
      const sucessoHtml = `
                <html>
                    <head><title>Email Confirmado</title></head>
                    <body>
                        <div style="text-align: center; margin-top: 50px;">
                            <h2>✅ Sucesso!</h2>
                            <p>Seu e-mail foi verificado com sucesso. Você já pode acessar o SIAPESQ.</p>
                            <p><a href="[URL_DO_FRONTEND_LOGIN]" style="color: #2D81AF;">Ir para o Login</a></p>
                        </div>
                    </body>
                </html>
            `;
      return res.status(http_status.OK).send(sucessoHtml);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      const erroHtml = `
                <html>
                    <head><title>Erro de Verificação</title></head>
                    <body>
                        <div style="text-align: center; margin-top: 50px; color: red;">
                            <h2>❌ Erro!</h2>
                            <p>${err.message || "Ocorreu um erro na verificação do seu e-mail."}</p>
                            <p>Tente solicitar um novo link de verificação.</p>
                        </div>
                    </body>
                </html>
            `;
      return res.status(statusCode).send(erroHtml);
    }
  }
}

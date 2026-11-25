import http_status from "../../../consts/http-status-enum";
import Joi from "joi";
import usuarios from "../../../models/siapesq/Usuarios";
import {
  CriarUsuarioBody,
  CriarUsuarioResponse,
} from "../../../types/siapesq_types/Usuarios-types";
import AuthServices from "../../../services/auth-services";
const schema = Joi.object({
  nome: Joi.string().required(),
  email: Joi.string().email().required(),
  senha: Joi.string().required(),
  contato: Joi.string().optional(),
  cpf: Joi.string().required(),
  titulo_cientifico: Joi.boolean().optional(),
  tipo_usuario: Joi.string().valid("ADMIN", "PESQUISADOR", "PADRAO").optional(),
  email_verificado: Joi.boolean().optional(),
  ultimo_acesso: Joi.date().optional(),
});
export default class CriarUsuarioUseCase {
  static async valida(body: CriarUsuarioBody) {
    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(body: CriarUsuarioBody): Promise<CriarUsuarioResponse> {
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
      } = body;

      const checa_email = await usuarios.findOne({ where: { email } });
      if (checa_email) {
        throw {
          message: `Usuario ${email} ja foi cadastrado`,
          status: http_status.CONFLICT,
        };
      }

      const checa_cpf = await usuarios.findOne({ where: { cpf } });
      if (checa_cpf) {
        throw {
          message: `CPF ${cpf} ja foi cadastrado`,
          status: http_status.CONFLICT,
        };
      }

      const usuario = await usuarios.create({
        nome,
        email,
        senha: await AuthServices.hash_senha(senha),
        contato,
        cpf,
        titulo_cientifico,
        tipo_usuario,
        email_verificado,
        ultimo_acesso,
      });

      const segredo = process.env.JWT_SECRET;
      if (!segredo) {
        throw {
          message: "JWT_SECRET nao setado",
          status: http_status.INTERNAL_ERROR,
        };
      }

      const token = AuthServices.gera_jwt_token(
        { id: usuario.id_usuario },
        segredo
      );

      return {
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        contato: usuario.contato,
        cpf: usuario.cpf,
        titulo_cientifico: usuario.titulo_cientifico,
        tipo_usuario: usuario.tipo_usuario,
        email_verificado: usuario.email_verificado,
        ultimo_acesso: usuario.ultimo_acesso,
        token: token,
      };
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}

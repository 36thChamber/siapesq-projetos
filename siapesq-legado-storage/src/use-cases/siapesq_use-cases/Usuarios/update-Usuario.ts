import Joi from "joi";
import usuarios from "../../../models/siapesq/Usuarios";
import {
  UpdateUsuarioBody,
  UpdateUsuarioResponse,
} from "../../../types/siapesq_types/Usuarios-types";
import AuthServices from "../../../services/auth-services";
import http_status from "../../../consts/http-status-enum";
const update_usuario_schema = Joi.object({
  id_usuario: Joi.string()
    .required()
    .error(new Error("ID do usuário é obrigatório")),
  nome: Joi.string().optional().error(new Error("Nome deve ser uma string")),
  email: Joi.string()
    .email()
    .optional()
    .error(new Error("Email deve ser válido")),
  antiga_senha: Joi.string()
    .optional()
    .error(new Error("antiga_senha deve ser uma string")),
  senha: Joi.string().optional().error(new Error("senha deve ser uma string")),
  contato: Joi.string()
    .optional()
    .error(new Error("Contato deve ser uma string")),
  cpf: Joi.string().optional().error(new Error("CPF deve ser uma string")),
  titulo_cientifico: Joi.boolean()
    .optional()
    .error(new Error("Título Científico deve ser um valor booleano")),
  tipo_usuario: Joi.string()
    .valid("ADMIN", "PESQUISADOR", "PADRAO")
    .optional()
    .error(new Error("Erro do tipo de usuário")),
  email_verificado: Joi.boolean()
    .optional()
    .error(new Error("Email Verificado deve ser um valor booleano")),
  ultimo_acesso: Joi.date()
    .optional()
    .error(new Error("Último acesso deve ser uma data")),
});

export default class UpdateUsuarioUseCase {
  static async valida(body: UpdateUsuarioBody) {
    try {
      await update_usuario_schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
  static async executa(
    body: UpdateUsuarioBody,
    id_usuario: string
  ): Promise<UpdateUsuarioResponse> {
    try {
      const usuario = await usuarios.findByPk(id_usuario);
      if (!usuario) {
        throw {
          message: `Usuario(${id_usuario}) não encontrado`,
          status: 404,
        };
      }
      if (body.senha) {
        if (!body.antiga_senha) {
          throw {
            message:
              "Quando o campo 'senha' for enviado o campo 'antiga_senha' também deve ser enviado",
            status: 400,
          };
        }
        const antiga_senha_eh_valida =
          await AuthServices.compara_senha_com_hash(
            body.antiga_senha,
            usuario.senha
          );
        if (!antiga_senha_eh_valida) {
          throw {
            message: " 'antiga_senha' está incorreta",
            status: 401,
          };
        }
        body.senha = await AuthServices.hash_senha(body.senha);
      }
      if (body.email) {
        const email_cadastrado = await usuarios.findOne({
          where: {
            email: body.email,
          },
        });
        if (email_cadastrado) {
          throw {
            message: "Email Já Cadastrado",
            status: 409,
          };
        }
      }
      await usuario.update(body);
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
        atualizado_em: usuario.atualizado_em,
      };
    } catch (err) {
      throw err;
    }
  }
}

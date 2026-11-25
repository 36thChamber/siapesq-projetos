import Joi from "joi";
import Usuarios from "../../../models/phytoBloom/Usuarios";
import {
  UpdateUsuarioBody,
  UpdateUsuarioResponse,
} from "../../../types/phytobloom-types/usuarios-types";
import AuthServices from "../../../services/auth-services";
import http_status from "../../../consts/http-status-enum";
const update_usuario_schema = Joi.object({
  nome: Joi.string().error(new Error("'nome' não é uma string")),
  email: Joi.string()
    .email()
    .error(new Error("'email' não é uma string ou um email válido")),
  telefone: Joi.string().error(new Error("'telefone' não é uma string")),
  ativo: Joi.boolean().error(new Error("ativo invalido")),
  user_verify: Joi.boolean().error(new Error("user_verify invalido")),
  senha: Joi.string().error(new Error("'senha' não é uma string")),
  antiga_senha: Joi.string().error(
    new Error("'antiga_senha' não é uma string")
  ),
  documento: Joi.string().error(new Error("'documento' não é uma string")),
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
    id_usuario: number | string
  ): Promise<UpdateUsuarioResponse> {
    try {
      const usuario = await Usuarios.findByPk(id_usuario);
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
        const email_cadastrado = await Usuarios.findOne({
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
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        documento: usuario.documento,
        ativo: usuario.ativo,
        user_verify: usuario.user_verify,
        criado_em: usuario.criado_em,
        atualizado_em: usuario.atualizado_em,
        deletado_em: usuario.deletado_em,
      };
    } catch (err) {
      throw err;
    }
  }
}

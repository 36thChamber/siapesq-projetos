import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import AuthServices from "../../services/auth-services";
import {
  AtualizarUsuarioBodyRequest,
  AtualizarUsuarioResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";
import { AppError } from "../../errors/app-error";

const updateUsuarioSchema = Joi.object({
  nome: Joi.string(),
  email: Joi.string().email(),
  telefone: Joi.string(),
  senha: Joi.string().min(6),
  antiga_senha: Joi.string(),
  insc_capt_portos: Joi.string(),
  documento: Joi.string(),
})
  .min(1)
  .messages({
    "object.min": "Informe ao menos um campo para atualizar",
    "string.email": "Email invalido",
    "string.min": "Senha deve ter pelo menos 6 caracteres",
  });

export default class AtualizarUsuarioUseCase {
  static async valida(body: AtualizarUsuarioBodyRequest) {
    try {
      await updateUsuarioSchema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    body: AtualizarUsuarioBodyRequest,
    id_usuario: number | string,
  ): Promise<AtualizarUsuarioResponse> {
    const usuario = await Usuarios.findByPk(id_usuario);

    if (!usuario) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Usuario(${id_usuario}) nao encontrado`);
    }

    if (body.senha) {
      if (!body.antiga_senha) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          "Quando o campo 'senha' for enviado o campo 'antiga_senha' tambem deve ser enviado"
        );
      }

      const antigaSenhaValida = await AuthServices.compara_senha_com_hash(
        body.antiga_senha,
        usuario.senha,
      );

      if (!antigaSenhaValida) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', "'antiga_senha' esta incorreta");
      }

      body.senha = await AuthServices.hash_senha(body.senha);
    }

    if (body.email) {
      const emailCadastrado = await Usuarios.findOne({
        where: { email: body.email },
      });

      if (emailCadastrado && emailCadastrado.id !== usuario.id) {
        throw new AppError(httpStatus.CONFLICT, 'DUPLICATE_ENTRY', "Email ja cadastrado");
      }
    }

    if (body.documento) {
      const documentoCadastrado = await Usuarios.findOne({
        where: { documento: body.documento },
      });

      if (documentoCadastrado && documentoCadastrado.id !== usuario.id) {
        throw new AppError(httpStatus.CONFLICT, 'DUPLICATE_ENTRY', "Documento ja cadastrado");
      }
    }

    if (body.insc_capt_portos) {
      const inscricaoCadastrada = await Usuarios.findOne({
        where: { insc_capt_portos: body.insc_capt_portos },
      });

      if (inscricaoCadastrada && inscricaoCadastrada.id !== usuario.id) {
        throw new AppError(httpStatus.CONFLICT, 'DUPLICATE_ENTRY', "Inscricao na Capitania dos Portos ja cadastrada");
      }
    }

    const { antiga_senha, ...dadosAtualizacao } = body;

    await usuario.update(dadosAtualizacao);

    return toUsuarioResponse(usuario);
  }
}
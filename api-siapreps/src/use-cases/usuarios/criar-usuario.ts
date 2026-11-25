import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import AuthServices from "../../services/auth-services";
import {
  CriarUsuarioBodyRequest,
  CriarUsuarioResponse,
  toUsuarioAutenticadoResponse,
} from "../../types/usuarios-types";
import { AppError } from "../../errors/app-error";

const createBodySchema = Joi.object({
  nome: Joi.string().required().messages({
    "any.required": "Nome e obrigatorio",
    "string.empty": "Nome invalido",
  }),
  email: Joi.string().email().required().messages({
    "any.required": "Email e obrigatorio",
    "string.email": "Email invalido",
  }),
  senha: Joi.string().min(6).required().messages({
    "any.required": "Senha e obrigatoria",
    "string.min": "Senha deve ter pelo menos 6 caracteres",
  }),
  documento: Joi.string().required().messages({
    "any.required": "Documento e obrigatorio",
  }),
  insc_capt_portos: Joi.string().required().messages({
    "any.required": "Inscricao na Capitania dos Portos e obrigatoria",
  }),
  telefone: Joi.string().required().messages({
    "any.required": "Telefone e obrigatorio",
  }),
});

export default class CriarUsuarioUseCase {
  static async valida(body: CriarUsuarioBodyRequest) {
    try {
      await createBodySchema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    body: CriarUsuarioBodyRequest,
  ): Promise<CriarUsuarioResponse> {
    const {
      nome,
      email,
      senha,
      documento,
      insc_capt_portos,
      telefone,
    } = body;

    const emailCadastrado = await Usuarios.findOne({
      where: { email },
    });

    if (emailCadastrado) {
      throw new AppError(httpStatus.CONFLICT, 'DUPLICATE_ENTRY', `Usuario ${email} ja foi cadastrado`);
    }

    const documentoCadastrado = await Usuarios.findOne({
      where: { documento },
    });

    if (documentoCadastrado) {
      throw new AppError(httpStatus.CONFLICT, 'DUPLICATE_ENTRY', `Documento ${documento} ja foi cadastrado`);
    }

    const inscricaoCadastrada = await Usuarios.findOne({
      where: { insc_capt_portos },
    });

    if (inscricaoCadastrada) {
      throw new AppError(httpStatus.CONFLICT, 'DUPLICATE_ENTRY', `Inscricao na Capitania dos Portos ${insc_capt_portos} ja foi cadastrada`);
    }

    const usuario = await Usuarios.create({
      nome,
      email,
      senha: await AuthServices.hash_senha(senha),
      documento,
      insc_capt_portos,
      telefone,
    });

    const segredo = process.env.JWT_SECRET;

    if (!segredo) {
      throw new AppError(httpStatus.INTERNAL_ERROR, 'INTERNAL_ERROR', "JWT_SECRET nao setado");
    }

    const token = AuthServices.gera_jwt_token(
      { id: usuario.id, administracao: usuario.administracao },
      segredo,
    );

    return toUsuarioAutenticadoResponse(
      usuario,
      token,
    );
  }
}
import Joi from "joi";
import httpStatus from "../consts/http-status-enum";
import Usuarios from "../models/Usuarios";
import AuthServices from "../services/auth-services";
import {
  UsuarioLoginRequestBody,
  UsuarioLoginResponse,
  toUsuarioLoginResponse,
} from "../types/usuarios-types";
import Embarcacoes from "../models/Embarcacoes";
import { AppError } from "../errors/app-error";

const loginBodySchema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "Email e obrigatorio",
    "string.email": "Email invalido",
  }),
  senha: Joi.string().required().messages({
    "any.required": "Senha e obrigatoria",
  }),
});

export default class LoginUseCase {
  static async valida(body: UsuarioLoginRequestBody) {
    try {
      await loginBodySchema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    body: UsuarioLoginRequestBody,
  ): Promise<UsuarioLoginResponse> {
    const usuario = await Usuarios.findOne({
      where: {
        email: body.email,
        ativo: true,
      },
      include: [
        {
          model: Embarcacoes,
          as: "embarcacoes",
          required: false,
        },
      ],
    });

    if (!usuario) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', "Email ou senha invalidos");
    }

    const senhaValida = await AuthServices.compara_senha_com_hash(
      body.senha,
      usuario.senha,
    );

    if (!senhaValida) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', "Email ou senha invalidos");
    }

    const segredo = process.env.JWT_SECRET;

    if (!segredo) {
      throw new AppError(httpStatus.INTERNAL_ERROR, 'INTERNAL_ERROR', "JWT_SECRET nao setado");
    }

    const token = AuthServices.gera_jwt_token(
      {
        id: usuario.id,
        administracao: usuario.administracao,
        session_id: AuthServices.generateRandomToken(16),
      },
      segredo,
    );

    return toUsuarioLoginResponse(usuario, token);
  }
}
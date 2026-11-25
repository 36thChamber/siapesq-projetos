import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import AuthServices, { PayloadTokenEmail } from "../../services/auth-services";

export default class RedefinirSenhaUseCase {
  static async executa(
    token: string,
    novaSenha: string,
  ): Promise<{ message: string }> {
    if (!token) {
      throw { message: "Token e obrigatorio", status: http_status.BAD_REQUEST };
    }

    if (!novaSenha || novaSenha.length < 6) {
      throw {
        message: "A nova senha deve ter no minimo 6 caracteres",
        status: http_status.BAD_REQUEST,
      };
    }

    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      throw { message: "JWT_SECRET nao configurado", status: http_status.INTERNAL_ERROR };
    }

    // Decodifica e valida assinatura + expiracao do JWT.
    let payload: PayloadTokenEmail;
    try {
      payload = AuthServices.decoda_jwt_token_email(token, segredo);
    } catch (err: any) {
      const isExpired = err?.name === "TokenExpiredError";
      throw {
        message: isExpired ? "Token expirado" : "Token invalido",
        status: http_status.BAD_REQUEST,
      };
    }

    // Valida que o token e exclusivamente para redefinicao de senha
    if (payload.purpose !== "password-reset") {
      throw {
        message: "Token invalido para esta operacao",
        status: http_status.BAD_REQUEST,
      };
    }

    const usuario = await Usuarios.findByPk(payload.id);
    if (!usuario) {
      throw { message: "Usuario nao encontrado", status: http_status.NOT_FOUND };
    }

    const senhaHash = await AuthServices.hash_senha(novaSenha);

    // Consumo atomico: atualiza senha e incrementa reset_token_version
    // somente se a versao no banco ainda for a mesma do token.
    // Se outra requisicao ja consumiu o token, affectedRows sera 0.
    const [affectedRows] = await Usuarios.update(
      {
        senha: senhaHash,
        reset_token_version: usuario.reset_token_version + 1,
      },
      {
        where: {
          id: usuario.id,
          reset_token_version: payload.version,
        },
      },
    );

    if (affectedRows === 0) {
      throw {
        message: "Token ja utilizado ou invalido",
        status: http_status.BAD_REQUEST,
      };
    }

    return { message: "Senha redefinida com sucesso" };
  }
}

import Usuarios from "../../models/Usuarios";
import AuthServices, { PayloadTokenEmail } from "../../services/auth-services";
import http_status from "../../consts/http-status-enum";

export default class VerificarEmailUseCase {
  static async executa(token: string): Promise<{ message: string }> {
    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      throw { message: "JWT_SECRET nao configurado", status: http_status.INTERNAL_ERROR };
    }

    // Decodifica e valida a assinatura + expiracao do JWT
    // decoda_jwt_token lanca excecao se expirado ou adulterado
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

    // Valida que o token e exclusivamente para verificacao de e-mail
    if (payload.purpose !== "email-verification") {
      throw { message: "Token invalido para esta operacao", status: http_status.BAD_REQUEST };
    }

    const usuario = await Usuarios.findByPk(payload.id);
    if (!usuario) {
      throw { message: "Usuario nao encontrado", status: http_status.NOT_FOUND };
    }

    // Idempotente: ja verificado, retorna sucesso
    if (usuario.user_verify) {
      return { message: "E-mail ja verificado" };
    }

    // Consumo atomico: atualiza user_verify=true e incrementa verify_token_version
    // somente se a versao no banco ainda for a mesma do token
    // Se outra requisicao ja consumiu o token (incrementou a versao), affectedRows sera 0
    const [affectedRows] = await Usuarios.update(
      { user_verify: true, verify_token_version: usuario.verify_token_version + 1 },
      {
        where: {
          id: usuario.id,
          verify_token_version: payload.version,
        },
      },
    );

    if (affectedRows === 0) {
      throw {
        message: "Token ja utilizado ou invalido",
        status: http_status.BAD_REQUEST,
      };
    }

    return { message: "E-mail verificado com sucesso" };
  }
}

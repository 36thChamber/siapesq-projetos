import { compare, genSalt, hash } from "bcrypt";
import { JwtPayload, sign, verify } from "jsonwebtoken";
import * as crypto from "crypto";

interface PayloadTokenUsuario extends JwtPayload {
  id: number | string;
}

/**
 * Payload usado nos tokens de e-mail (verificação e redefinição de senha)
 * - purpose: discrimina o tipo de token para evitar reuso entre fluxos
 * - version: versão do contador correspondente no banco - garante uso único
 */
export interface PayloadTokenEmail extends JwtPayload {
  id: number | string;
  purpose: "email-verification" | "password-reset";
  version: number;
}

export default class AuthServices {
  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  static async hash_senha(senha: string): Promise<string> {
    const salt = await genSalt(10);
    return await hash(senha, salt);
  }

  static async compara_senha_com_hash(
    senha: string,
    hash_salvo: string,
  ): Promise<boolean> {
    return await compare(senha, hash_salvo);
  }

  static gera_jwt_token(payload: PayloadTokenUsuario, segredo: string): string {
    return sign(payload, segredo, { expiresIn: "360d" });
  }

  /**
   * Gera um token JWT para fluxos de e-mail (verificação ou redefinição de senha)
   * @param payload - Deve conter id, purpose e version
   * @param segredo - JWT_SECRET
   * @param expiresIn - Expiração do token: "24h" para verificação, "1h" para reset
   */
  static gera_jwt_token_email(
    payload: PayloadTokenEmail,
    segredo: string,
    expiresIn: string = "1h",
  ): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return sign(payload, segredo, { expiresIn: expiresIn as any });
  }

  static decoda_jwt_token(token: string, segredo: string): PayloadTokenUsuario {
    const payload = verify(token, segredo);
    if (typeof payload === "string") {
      throw new Error("JWT payload nao pode ser uma string");
    }

    return {
      id: payload.id,
      ...payload,
    };
  }

  /**
   * Decodifica e valida um token dos fluxos de e-mail (verificacao ou redefinicao de senha),
   * tipado como PayloadTokenEmail (purpose + version) em vez do PayloadTokenUsuario generico.
   */
  static decoda_jwt_token_email(token: string, segredo: string): PayloadTokenEmail {
    const payload = verify(token, segredo);
    if (typeof payload === "string") {
      throw new Error("JWT payload nao pode ser uma string");
    }

    return {
      id: payload.id,
      purpose: payload.purpose,
      version: payload.version,
      ...payload,
    };
  }
}

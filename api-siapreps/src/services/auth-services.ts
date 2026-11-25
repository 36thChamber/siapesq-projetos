import { compare, genSalt, hash } from "bcrypt";
import * as crypto from "crypto";
import { JwtPayload, sign, verify } from "jsonwebtoken";

interface PayloadTokenUsuario extends JwtPayload {
  id: number | string;
  administracao: boolean;
  session_id?: string;
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
    hashSenha: string,
  ): Promise<boolean> {
    return await compare(senha, hashSenha);
  }

  static gera_jwt_token(
    payload: PayloadTokenUsuario,
    segredo: string,
  ): string {
    return sign(payload, segredo, { expiresIn: "360d" });
  }

  static gera_jwt_token_email(
    payload: PayloadTokenUsuario,
    segredo: string,
  ): string {
    return sign(payload, segredo, { expiresIn: "1h" });
  }

  static decoda_jwt_token(
    token: string,
    segredo: string,
  ): PayloadTokenUsuario {
    const payload = verify(token, segredo);
    if (typeof payload === "string") {
      throw new Error("JWT payload não pode ser uma string");
    }

    return {
           id: payload.id,
      administracao: payload.administracao,
      session_id: payload.session_id,
      ...payload,
    };
  }
}

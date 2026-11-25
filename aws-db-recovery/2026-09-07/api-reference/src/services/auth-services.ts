import { hash, compare, genSalt } from "bcrypt";
import { sign, verify, JwtPayload } from "jsonwebtoken";
import * as crypto from 'crypto';

interface PayloadTokenUsuario extends JwtPayload {
  id: number | string;
}
export default class AuthServices {
  static generateRandomToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }
  static async hash_senha(senha: string): Promise<string> {
    const salt = await genSalt(10);
    return await hash(senha, salt);
  }
  static async compara_senha_com_hash(
    senha: string,
    hash: string
  ): Promise<boolean> {
    return await compare(senha, hash);
  }
  static gera_jwt_token(payload: PayloadTokenUsuario, segredo: string): string {
    return sign(payload, segredo, { expiresIn: "360d" });
  }
  static gera_jwt_token_email(
    payload: PayloadTokenUsuario,
    segredo: string
  ): string {
    return sign(payload, segredo, { expiresIn: "1h" });
  }

  static decoda_jwt_token(token: string, segredo: string): PayloadTokenUsuario {
    const payload = verify(token, segredo);
    if (typeof payload == "string") {
      throw "JWTpayload não pode ser uma string";
    }
    return {
      id: payload.id,
      ...payload,
    };
  }
}

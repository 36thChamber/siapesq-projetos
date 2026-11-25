import { hash, compare, genSalt } from "bcrypt";
import { sign, verify, JwtPayload, SignOptions } from "jsonwebtoken";
import * as crypto from "crypto";
import { TipoUsuario } from "../models/enums/tipoUsuarioEnum";

export interface PayloadTokenUsuario extends JwtPayload {
  id: string;
  /* Claim informativo da sessão; tokens legados podem não possuir este campo. */
  tipo_usuario?: TipoUsuario;
  email?: string;
  type?: string;
  purpose?: "authentication" | "email_verification" | "password_reset";
  passwordVersion?: string;
}

interface PayloadTokenSessao extends JwtPayload {
  id: string;
  tipo_usuario: TipoUsuario;
  passwordVersion?: string;
}

interface PayloadTokenEmail extends JwtPayload {
  id: string;
  email?: string;
  type?: string;
  purpose?: "email_verification" | "password_reset";
  passwordVersion?: string;
}

type ExpiresIn = SignOptions["expiresIn"];

export default class AuthServices {
  static versao_senha_sessao(hashSenha: string, segredo: string): string {
    return crypto.createHmac("sha256", segredo).update("siapesq:session-password:v1:" + hashSenha).digest("hex");
  }
  static segredo_verificacao_email(segredo: string): string {
    return crypto.createHmac("sha256", segredo)
      .update("siapesq:email_verification:v1")
      .digest("hex");
  }

  static segredo_recuperacao_senha(segredo: string): string {
    return crypto.createHmac("sha256", segredo)
      .update("siapesq:password_reset:v1")
      .digest("hex");
  }

  static versao_senha_recuperacao(hashSenha: string, segredo: string): string {
    return crypto.createHmac("sha256", this.segredo_recuperacao_senha(segredo))
      .update(hashSenha)
      .digest("hex");
  }

  static expiracao_email(valor: string | undefined, padrao: string, nome: string): ExpiresIn {
    const expiracao = valor || padrao;
    if (!/^[1-9]\d*[smhd]$/.test(expiracao)) {
      throw { message: `${nome} inválida.`, status: 500 };
    }
    return expiracao as ExpiresIn;
  }

  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  static async hash_senha(senha: string): Promise<string> {
    const salt = await genSalt(10);
    return await hash(senha, salt);
  }

  static async compara_senha_com_hash(
    senha: string,
    hash: string,
  ): Promise<boolean> {
    return await compare(senha, hash);
  }
  static gera_jwt_token(payload: PayloadTokenSessao, segredo: string): string {
    return sign({ ...payload, purpose: "authentication" }, segredo, {
      expiresIn: this.expiracao_email(process.env.AUTH_TOKEN_EXPIRATION, "8h", "AUTH_TOKEN_EXPIRATION"),
    });
  }

  static gera_jwt_token_email(
    payload: PayloadTokenEmail,
    segredo: string,
    expiresIn: ExpiresIn = "1h",
  ): string {
    return sign(payload, segredo, { expiresIn });
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

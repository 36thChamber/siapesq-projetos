import { Op } from "sequelize";
import crypto from "crypto";
import IdempotencyKeys from "../models/IdempotencyKeys";
import { Transaction } from "sequelize";
import {
  RegistrarIdempotenciaParams,
  ResultadoVerificacaoIdempotencia,
  VerificarIdempotenciaParams,
} from "../types/idempotencia-types";

export const IDEMPOTENCY_TTL_MS = process.env.IDEMPOTENCY_TTL_MS
  ? Number(process.env.IDEMPOTENCY_TTL_MS)
  : 24 * 60 * 60 * 1000; // 24h — janela de reconexão esperada em missões offline

export default class IdempotenciaServices {
  static iniciarTransacao(): Promise<Transaction> {
    if (!IdempotencyKeys.sequelize) {
      throw new Error("ORM não inicializado para operação idempotente");
    }
    return IdempotencyKeys.sequelize.transaction();
  }

  static async bloquearChaveTransacao(transaction: Transaction, lockKey: string): Promise<void> {
    const lockId = crypto.createHash("sha256").update(lockKey).digest().readBigInt64BE(0).toString();
    await IdempotencyKeys.sequelize!.query(
      "SELECT pg_advisory_xact_lock($1::bigint)",
      { bind: [lockId], transaction },
    );
  }

  static async verificar(
    params: VerificarIdempotenciaParams,
    transaction?: Transaction,
  ): Promise<ResultadoVerificacaoIdempotencia> {
    const { chave, escopo, id_usuario, hashCorpo } = params;

    const registro = await IdempotencyKeys.findOne({
      where: {
        chave,
        escopo,
        id_usuario,
        expira_em: { [Op.gt]: new Date() },
      },
      transaction,
    });

    if (!registro) {
      return { tipo: "novo" };
    }

    if (registro.hash_corpo !== hashCorpo) {
      return { tipo: "conflito" };
    }

    return {
      tipo: "replay",
      status: registro.status_resposta,
      corpo: registro.corpo_resposta,
    };
  }

  static async registrar(params: RegistrarIdempotenciaParams, transaction?: Transaction): Promise<void> {
    const { chave, escopo, id_usuario, hashCorpo, status, corpo } = params;

    await IdempotencyKeys.upsert({
      chave,
      escopo,
      id_usuario,
      hash_corpo: hashCorpo,
      status_resposta: status,
      corpo_resposta: corpo,
      expira_em: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    }, { transaction });
  }
}

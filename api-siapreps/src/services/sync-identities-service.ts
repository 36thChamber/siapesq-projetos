import crypto from "crypto";
import { Transaction } from "sequelize";
import http_status from "../consts/http-status-enum";
import { AppError } from "../errors/app-error";
import SyncIdentities, { SyncEntityType } from "../models/SyncIdentities";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const entries = Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashCanonicalPayload(value: unknown): string {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export type SyncIdentityResult<T> = { record: T; replayed: boolean };

export default class SyncIdentitiesService {
  static async createOrGet<T extends { id: number }>(params: {
    entityType: SyncEntityType;
    ownerId: number;
    clientRecordId?: string;
    payload: unknown;
    transaction?: Transaction;
    create: () => Promise<T>;
    load: (remoteId: number) => Promise<T | null>;
    loadByClientRecord: (ownerId: number) => Promise<T | null>;
  }): Promise<SyncIdentityResult<T>> {
    const { clientRecordId, transaction } = params;
    if (!clientRecordId) {
      return { record: await params.create(), replayed: false };
    }
    if (!transaction) {
      throw new Error("client_record_id requer transação para criação/reconciliação atômica");
    }

    const identityPayload = params.payload && typeof params.payload === "object" && !Array.isArray(params.payload)
      ? { ...(params.payload as Record<string, unknown>) }
      : params.payload;
    if (identityPayload && typeof identityPayload === "object" && !Array.isArray(identityPayload)) {
      delete (identityPayload as Record<string, unknown>).client_record_id;
    }
    const payloadHash = hashCanonicalPayload(identityPayload);
    const identity = await SyncIdentities.findOne({
      where: {
        entity_type: params.entityType,
        client_record_id: clientRecordId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (identity) {
      if (Number(identity.id_usuario) !== Number(params.ownerId)) {
        throw new AppError(http_status.CONFLICT, "CLIENT_RECORD_ID_CONFLICT", "client_record_id já utilizado");
      }
      const record = await params.load(identity.remote_id);
      if (!record) {
        throw new AppError(http_status.CONFLICT, "CLIENT_RECORD_ID_CONFLICT", "client_record_id pertence a um registro removido");
      }
      // Registros anteriores à implantação não têm hash do payload original.
      // O ID estável é a única evidência disponível para reconciliar esse legado.
      if (identity.payload_hash === "legacy-unverified") {
        return { record, replayed: true };
      }
      if (identity.payload_hash !== payloadHash) {
        throw new AppError(http_status.CONFLICT, "CLIENT_RECORD_ID_CONFLICT", "client_record_id já utilizado com outro conteúdo");
      }
      return { record, replayed: true };
    }

    // Compatibility with writes made by an older API instance that did not
    // write sync_identities. Entity tables already have a global unique ID.
    const legacyRecord = await params.loadByClientRecord(params.ownerId);
    if (legacyRecord) {
      await SyncIdentities.create({
        id_usuario: params.ownerId,
        entity_type: params.entityType,
        client_record_id: clientRecordId,
        payload_hash: "legacy-unverified",
        remote_id: legacyRecord.id,
      }, { transaction });
      return { record: legacyRecord, replayed: true };
    }

    const record = await params.create();
    await SyncIdentities.create({
      id_usuario: params.ownerId,
      entity_type: params.entityType,
      client_record_id: clientRecordId,
      payload_hash: payloadHash,
      remote_id: record.id,
    }, { transaction });
    return { record, replayed: false };
  }
}

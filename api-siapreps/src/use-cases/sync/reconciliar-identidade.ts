import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import { AppError } from "../../errors/app-error";
import Incidentes from "../../models/Incidentes";
import Lances from "../../models/Lances";
import Missoes from "../../models/Missoes";
import OcorrenciasLance from "../../models/OcorrenciasLance";
import SyncIdentities, { SYNC_ENTITY_TYPES, SyncEntityType } from "../../models/SyncIdentities";
import { toIncidenteResponse } from "../../types/incidentes-types";
import { toLanceResponse } from "../../types/Lances-types";
import { toMissaoResponse } from "../../types/Missoes-types";
import { toOcorrenciaLanceResponse } from "../../types/ocorrencias-lance-types";

const paramsSchema = Joi.object({
  entity: Joi.string().valid(...SYNC_ENTITY_TYPES).required(),
  clientRecordId: Joi.string().uuid({ version: ["uuidv4"] }).required(),
  userId: Joi.number().integer().positive().required(),
  administracao: Joi.boolean().required(),
});

export default class ReconciliarIdentidadeUseCase {
  static async executa(params: {
    entity: string;
    clientRecordId: string;
    userId: number;
    administracao: boolean;
  }) {
    try {
      await paramsSchema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, "VALIDATION_ERROR", err.message);
    }

    const identity = await SyncIdentities.findOne({
      where: {
        entity_type: params.entity,
        client_record_id: params.clientRecordId,
        ...(params.administracao ? {} : { id_usuario: params.userId }),
      },
    });
    if (!identity) {
      const legacyRecord = await this.loadByClientRecord(
        params.entity as SyncEntityType,
        params.clientRecordId,
        params.administracao ? undefined : params.userId,
      );
      if (!legacyRecord) throw this.notFound();
      return {
        entity: params.entity,
        client_record_id: params.clientRecordId,
        status: "found" as const,
        record: legacyRecord,
      };
    }

    const record = await this.load(identity.entity_type, identity.remote_id, identity.id_usuario);
    if (!record) throw this.notFound();
    return {
      entity: identity.entity_type,
      client_record_id: identity.client_record_id,
      status: "found" as const,
      record,
    };
  }

  private static async load(entity: SyncEntityType, id: number, ownerId: number): Promise<object | null> {
    if (entity === "missoes") {
      const record = await Missoes.findOne({ where: { id, id_usuario: ownerId } });
      return record ? toMissaoResponse(record) : null;
    }
    if (entity === "lances") {
      const record = await Lances.findOne({
        where: { id },
        include: [{ model: Missoes, as: "missao", where: { id_usuario: ownerId } }],
      });
      return record ? toLanceResponse(record) : null;
    }
    if (entity === "ocorrencias-lance") {
      const record = await OcorrenciasLance.findOne({
        where: { id },
        include: [{
          model: Lances,
          as: "lance",
          include: [{ model: Missoes, as: "missao", where: { id_usuario: ownerId } }],
        }],
      });
      return record ? toOcorrenciaLanceResponse(record) : null;
    }
    const record = await Incidentes.findByPk(id, {
      include: [{ model: Missoes, as: "missao", where: { id_usuario: ownerId } }],
    });
    return record ? toIncidenteResponse(record) : null;
  }

  private static async loadByClientRecord(
    entity: SyncEntityType,
    clientRecordId: string,
    ownerId?: number,
  ): Promise<object | null> {
    if (entity === "missoes") {
      const record = await Missoes.findOne({ where: { client_record_id: clientRecordId, ...(ownerId ? { id_usuario: ownerId } : {}) } });
      return record ? toMissaoResponse(record) : null;
    }
    if (entity === "lances") {
      const record = await Lances.findOne({
        where: { client_record_id: clientRecordId },
        include: [{ model: Missoes, as: "missao", ...(ownerId ? { where: { id_usuario: ownerId } } : {}) }],
      });
      return record ? toLanceResponse(record) : null;
    }
    if (entity === "ocorrencias-lance") {
      const record = await OcorrenciasLance.findOne({
        where: { client_record_id: clientRecordId },
        include: [{
          model: Lances,
          as: "lance",
          include: [{ model: Missoes, as: "missao", ...(ownerId ? { where: { id_usuario: ownerId } } : {}) }],
        }],
      });
      return record ? toOcorrenciaLanceResponse(record) : null;
    }
    const record = await Incidentes.findOne({
      where: { client_record_id: clientRecordId },
      include: [{ model: Missoes, as: "missao", ...(ownerId ? { where: { id_usuario: ownerId } } : {}) }],
    });
    return record ? toIncidenteResponse(record) : null;
  }

  private static notFound() {
    return new AppError(http_status.NOT_FOUND, "NOT_FOUND", "Registro não encontrado");
  }
}

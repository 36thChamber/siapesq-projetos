import {
  AllowNull,
  AutoIncrement,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import Usuarios from "./Usuarios";

export const SYNC_ENTITY_TYPES = [
  "missoes",
  "lances",
  "ocorrencias-lance",
  "incidentes",
] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

@Table({
  schema: "siapreps",
  tableName: "sync_identities",
  timestamps: false,
  indexes: [
    { unique: true, name: "uq_sync_identities_entity_client", fields: ["entity_type", "client_record_id"] },
    { name: "idx_sync_identities_owner_entity_client", fields: ["id_usuario", "entity_type", "client_record_id"] },
  ],
})
export default class SyncIdentities extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @ForeignKey(() => Usuarios)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  id_usuario: number;

  @AllowNull(false)
  @Column(DataType.STRING(32))
  entity_type: SyncEntityType;

  @AllowNull(false)
  @Column(DataType.UUID)
  client_record_id: string;

  @AllowNull(false)
  @Column(DataType.STRING(64))
  payload_hash: string;

  @AllowNull(false)
  @Column(DataType.BIGINT)
  remote_id: number;

  @Column({ type: DataType.DATE, field: "created_at", defaultValue: DataType.NOW })
  created_at: Date;
}

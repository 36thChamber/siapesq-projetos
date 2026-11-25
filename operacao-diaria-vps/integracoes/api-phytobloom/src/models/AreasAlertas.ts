import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  Comment,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  HasMany,
  Index,
  Model,
  NotNull,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";

import Reservatorios from "./Reservatorios";
import Alertas from "./Alertas";

@Table({
  tableName: "areas_alertas",
  schema: "phytobloom",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
})
export default class AreasAlertas extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @ForeignKey(() => Reservatorios)
  @Index
  @AllowNull(false)
  @NotNull
  @Comment("Reservatório ao qual a área pertence")
  @Column(DataType.BIGINT)
  id_reservatorio: number;

  @AllowNull(false)
  @NotNull
  @Column(DataType.STRING(255))
  nome: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  descricao: string | null;

  @AllowNull(true)
  @Comment("Tipos sugeridos: geral, automatica, customizada")
  @Column(DataType.STRING(100))
  tipo: string | null;

  @AllowNull(false)
  @NotNull
  @Comment("Região da área de alerta marcada no mapa")
  @Column(DataType.JSONB)
  regiao_alerta: unknown;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  prioridade: number | null;

  @Default(true)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  ativa: boolean;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  criada_automaticamente: boolean;

  @CreatedAt
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em: Date | null;

  @BelongsTo(() => Reservatorios, {
    foreignKey: "id_reservatorio",
    as: "reservatorio",
  })
  reservatorio?: Reservatorios;

  @HasMany(() => Alertas, {
    foreignKey: "id_area_alerta",
    as: "alertas",
  })
  alertas?: Alertas[];
}
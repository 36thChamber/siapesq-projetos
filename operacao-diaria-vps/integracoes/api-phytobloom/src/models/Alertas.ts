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
  Index,
  Model,
  NotNull,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";

import Usuarios from "./Usuarios";
import Reservatorios from "./Reservatorios";
import AreasAlertas from "./AreasAlertas";

@Table({
  tableName: "alertas",
  schema: "phytobloom",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
})
export default class Alertas extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @ForeignKey(() => Usuarios)
  @Index
  @AllowNull(true)
  @Column(DataType.BIGINT)
  id_usuario: number | null;

  @ForeignKey(() => Reservatorios)
  @Index
  @AllowNull(false)
  @NotNull
  @Column(DataType.BIGINT)
  id_reservatorio: number;

  @ForeignKey(() => AreasAlertas)
  @Index
  @AllowNull(false)
  @NotNull
  @Column(DataType.BIGINT)
  id_area_alerta: number;

  @AllowNull(false)
  @NotNull
  @Comment("Tipos esperados: NDCI, TSI, ALGAS, MACROFITAS")
  @Column(DataType.STRING(50))
  tipo: string;

  @AllowNull(true)
  @Comment("Ex: baixo, moderado, alto, critico, eutrofica etc.")
  @Column(DataType.STRING(50))
  nivel: string | null;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  titulo: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  descricao: string | null;

  @AllowNull(false)
  @NotNull
  @Column(DataType.DATE)
  data_analise: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  data_alerta: Date | null;

  @AllowNull(true)
  @Column(DataType.DECIMAL)
  percentual_principal: number | null;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  total_pixels: number | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  detalhes: Record<string, unknown> | null;

  @Default("novo")
  @AllowNull(false)
  @Comment("Status esperados: novo, visualizado, resolvido, ignorado")
  @Column(DataType.STRING(50))
  status: string;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  visualizado: boolean;

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

  @BelongsTo(() => Usuarios, {
    foreignKey: "id_usuario",
    as: "usuario",
  })
  usuario?: Usuarios;

  @BelongsTo(() => Reservatorios, {
    foreignKey: "id_reservatorio",
    as: "reservatorio",
  })
  reservatorio?: Reservatorios;

  @BelongsTo(() => AreasAlertas, {
    foreignKey: "id_area_alerta",
    as: "area",
  })
  area?: AreasAlertas;
}
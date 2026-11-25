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
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "sequelize-typescript";

import Usuarios from "./Usuarios";
import AreasAlertas from "./AreasAlertas";
import Alertas from "./Alertas";

interface PosicaoData {
  latitude: string;
  longitude: string;
}

@Table({
  tableName: "reservatorios",
  schema: "phytobloom",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
  indexes: [
    {
      name: "idx_reservatorios_usuario_nome",
      unique: true,
      fields: ["id_usuario", "nome"],
    },
  ],
})
export default class Reservatorios extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @ForeignKey(() => Usuarios)
  @Index
  @AllowNull(false)
  @Comment("Id do usuário associado ao reservatório")
  @Column(DataType.BIGINT)
  id_usuario: number;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  nome: string;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  prioridade: number | null;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  favorito: boolean;

  @AllowNull(true)
  @Comment("Pontos marcados no mapa para o reservatório")
  @Column(DataType.JSONB)
  posicoes: PosicaoData[] | null;

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

  @HasMany(() => AreasAlertas, {
    foreignKey: "id_reservatorio",
    as: "areas",
  })
  areas?: AreasAlertas[];

  @HasMany(() => Alertas, {
    foreignKey: "id_reservatorio",
    as: "alertas",
  })
  alertas?: Alertas[];
}
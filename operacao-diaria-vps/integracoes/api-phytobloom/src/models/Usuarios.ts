import {
  AllowNull,
  AutoIncrement,
  Column,
  Comment,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "sequelize-typescript";

import Reservatorios from "./Reservatorios";
import Alertas from "./Alertas";

@Table({
  tableName: "usuarios",
  schema: "phytobloom",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
})
export default class Usuarios extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  nome: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  documento: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  email: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  senha: string;

  @AllowNull(false)
  @Comment("Formato esperado +DDI(DDD)XXXXXXXXX")
  @Column(DataType.STRING)
  telefone: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  ativo: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  user_verify: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_admin: boolean;
  
  @Default(0)
  @Column(DataType.INTEGER)
  verify_token_version: number;

  @Default(0)
  @Column(DataType.INTEGER)
  reset_token_version: number;

  @CreatedAt
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em: Date | null;

  @HasMany(() => Reservatorios, {
    foreignKey: "id_usuario",
    as: "reservatorios",
  })
  reservatorios?: Reservatorios[];

  @HasMany(() => Alertas, {
    foreignKey: "id_usuario",
    as: "alertas",
  })
  alertas?: Alertas[];
}

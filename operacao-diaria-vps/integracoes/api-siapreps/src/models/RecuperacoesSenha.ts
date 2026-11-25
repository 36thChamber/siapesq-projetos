import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import Usuarios from "./Usuarios";

@Table({
  schema: "siapreps",
  tableName: "recuperacoes_senha",
  timestamps: true,
  updatedAt: false,
  createdAt: "criado_em",
})
export default class RecuperacoesSenha extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Usuarios)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  declare id_usuario: number;

  @BelongsTo(() => Usuarios)
  declare usuario: Usuarios;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare token_hash: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expira_em: Date;

  @Column(DataType.DATE)
  declare utilizado_em?: Date;

  @CreatedAt
  @Column(DataType.DATE)
  declare criado_em: Date;
}

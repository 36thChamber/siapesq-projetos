import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  Comment,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

import Usuarios from "./Usuarios";

@Table({
  schema: "siapreps",
  tableName: "usuarios_ativos",
  timestamps: false,
})
export default class UsuariosAtivos extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @ForeignKey(() => Usuarios)
  @AllowNull(false)
  @Comment("Id do usuário vinculado")
  @Column(DataType.BIGINT)
  id_usuario: number;

  @BelongsTo(() => Usuarios, {
    foreignKey: "id_usuario",
  })
  usuario: Usuarios;

  @Default(true)
  @Column(DataType.BOOLEAN)
  ativo: boolean;

  @Column(DataType.STRING)
  tipo_assinatura: string;

  @Column(DataType.DATE)
  data_criacao: Date;

  @Column(DataType.DATE)
  data_fim: Date;
}

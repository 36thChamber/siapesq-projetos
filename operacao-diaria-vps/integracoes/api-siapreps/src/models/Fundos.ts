import {
  AllowNull,
  AutoIncrement,
  Column,
  Comment,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "sequelize-typescript";

@Table({
  schema: "siapreps",
  tableName: "fundos",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
})
export default class Fundos extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @Unique
  @AllowNull(false)
  @Comment("Nome do fundo")
  @Column(DataType.STRING)
  nome: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  ativo: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em?: Date;
}

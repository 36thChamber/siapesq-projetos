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
  tableName: "especies",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
})
export default class Especies extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @Unique
  @AllowNull(false)
  @Comment("Especie do pescado")
  @Column(DataType.STRING)
  nome: string;

  @Comment("URL da imagem da especie")
  @Column(DataType.STRING)
  imagem: string;

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

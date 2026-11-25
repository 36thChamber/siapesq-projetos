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
  NotNull,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "sequelize-typescript";

@Table({
  schema: "siapreps",
  tableName: "portos",
  hooks: {
    afterUpdate: (porto) => {
      porto.updatedAt = new Date();
    },
  },
})
export default class Portos extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @Unique
  @AllowNull(false)
  @NotNull
  @Comment("Nome do porto")
  @Column(DataType.STRING)
  nome: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  ativo: boolean;

  @CreatedAt
  @Default(new Date())
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em: Date;
}

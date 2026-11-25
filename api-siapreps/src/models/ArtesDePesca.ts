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
  NotNull,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import Missoes from "./Missoes";

@Table({
  schema: "siapreps",
  tableName: "artes_de_pesca",
  hooks: {
    afterUpdate: (artesDePesca) => {
      artesDePesca.updatedAt = new Date();
    },
  },
})
export default class ArtesDePesca extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @HasMany(() => Missoes)
  missoes: Missoes[];

  @AllowNull(false)
  @NotNull
  @Comment("Nome da Arte de Pesca")
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

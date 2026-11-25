import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  Unique,
  NotNull,
  Comment,
  AllowNull,
  DataType,
} from "sequelize-typescript";

@Table({
  schema: "siapreps",
  tableName: "analises",
  timestamps: false,
})
export default class Analises extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @Unique
  @AllowNull(false)
  @NotNull
  @Comment("Nome comum da especie com analise TIF")
  @Column(DataType.STRING)
  nome_padrao: string;

  @Unique
  @AllowNull(false)
  @NotNull
  @Comment("Nome cientifico usado no arquivo TIF")
  @Column(DataType.STRING)
  nome_cientifico: string;
}

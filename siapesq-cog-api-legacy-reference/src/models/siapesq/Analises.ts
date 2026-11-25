import {
  Table,
  Column,
  PrimaryKey,
  Default,
  AllowNull,
  DataType,
  Model,
  Comment,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import especies from "./Especies";

@Table({
  tableName: "analises",
  schema: "siapesq",
  timestamps: false,
  hooks: {
    afterUpdate: (analise) => {
      analise.updatedAt = new Date();
    },
  },
})
export default class analises extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id_analise: string;

  @ForeignKey(() => especies)
  @Column(DataType.UUID)
  id_especie: string;

  @AllowNull(false)
  @Comment("Nome da pasta da especie no bucket aws")
  @Column(DataType.STRING)
  nome_pasta: string;

  @AllowNull(false)
  @Comment("Nome do arquivo da especie da especie no bucket aws")
  @Column(DataType.STRING)
  nome_arquivo: string;

  @AllowNull(true)
  @Comment("Nome do arquivo de 30m da especie no bucket aws")
  @Column(DataType.STRING)
  nome_arquivo_30: string | null;

  @BelongsTo(() => especies, "id_especie")
  especie: especies;
}

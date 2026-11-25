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

  @AllowNull(true)
  @Comment("Nome do arquivo nacional da especie no bucket aws")
  @Column(DataType.STRING)
  nome_arquivo_nacional: string | null;

  @AllowNull(true)
  @Comment("Nome do arquivo do cenario futuro otimista da especie no bucket aws")
  @Column(DataType.STRING)
  nome_arquivo_otimista: string | null;

  @AllowNull(true)
  @Comment("Nome do arquivo do cenario futuro pessimista da especie no bucket aws")
  @Column(DataType.STRING)
  nome_arquivo_pessimista: string | null;

  @AllowNull(true)
  @Comment("Nome do arquivo do cenario RS otimista da especie no bucket aws")
  @Column(DataType.STRING)
  nome_arquivo_rs_otimista: string | null;

  @AllowNull(true)
  @Comment("Nome do arquivo do cenario RS pessimista da especie no bucket aws")
  @Column(DataType.STRING)
  nome_arquivo_rs_pessimista: string | null;

  @AllowNull(true)
  @Comment("Nome do arquivo do cenario 30 metros otimista da especie no bucket aws")
  @Column(DataType.STRING)
  nome_arquivo_30_otimista: string | null;

  @AllowNull(true)
  @Comment("Nome do arquivo do cenario pessimista 30 metros da especie no bucket aws")
  @Column(DataType.STRING)
  nome_arquivo_30_pessimista: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  nacional_incerteza: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  nacional_ssp245_incerteza: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  rs_ssp245_incerteza: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  rs_ssp585_incerteza: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  poligono_ssp245_incerteza: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  poligono_ssp585_incerteza: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  rs_incerteza: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  poligono_incerteza: string | null;

  @BelongsTo(() => especies, "id_especie")
  especie: especies;
}

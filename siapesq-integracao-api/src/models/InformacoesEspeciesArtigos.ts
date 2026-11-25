import {
  Table,
  Column,
  PrimaryKey,
  ForeignKey,
  DataType,
  Model,
  Default,
} from "sequelize-typescript";
import informacoesEspecies from "./InformacoesEspecies";
import artigos from "./Artigos";

@Table({
  tableName: "informacoes_especies_artigos",
  schema: "siapesq",
  timestamps: false,
})
export default class informacoesEspeciesArtigos extends Model {
  @PrimaryKey
  @ForeignKey(() => informacoesEspecies)
  @Column(DataType.UUID)
  id_informacaoespecie: string;

  @PrimaryKey
  @ForeignKey(() => artigos)
  @Column(DataType.INTEGER)
  id_artigo: number;

  @Default(DataType.NOW)
  @Column(DataType.DATE)
  criado_em: Date;
}

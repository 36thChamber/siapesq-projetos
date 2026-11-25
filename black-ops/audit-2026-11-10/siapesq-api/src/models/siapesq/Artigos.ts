import {
  Table,
  Column,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  AllowNull,
  DataType,
  Model,
  Default,
  ForeignKey,
} from "sequelize-typescript";
import especies from "./Especies";

@Table({
  tableName: "artigos",
  schema: "siapesq",
  timestamps: false,
  hooks: {
    afterUpdate: (artigo) => {
      artigo.updatedAt = new Date();
    },
  },
})
export default class artigos extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.INTEGER)
  id_artigo: number;

  @ForeignKey(() => especies)
  @Column(DataType.UUID)
  id_especie: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  nome_especie: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  nome_artigo: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  artigo: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  referencia_texto: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  referencia_completa: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  link_drive: string;
}

import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  Comment,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  Model,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "sequelize-typescript";

import Missoes from "./Missoes";
import Lances from "./Lances";
import Especies from "./Especies";

export enum GrupoIncidente {
  AVE = "ave",
  ESPECIES_MARINHAS_PROTEGIDAS = "especies_marinhas_protegidas",
  TARTARUGA = "tartaruga",
  MAMIFERO_MARINHO = "mamifero_marinho",
  OUTRO = "outro",
}

@Table({
  schema: "siapreps",
  tableName: "incidentes",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em"
})
export default class Incidentes extends Model {
  @PrimaryKey
  @AutoIncrement
  @Comment("Id do incidente de fauna acidental")
  @Column(DataType.BIGINT)
  id: number;

  @ForeignKey(() => Missoes)
  @AllowNull(false)
  @NotNull
  @Comment("ID da missão durante a qual ocorreu o incidente")
  @Column(DataType.BIGINT)
  id_missao: number;

  @BelongsTo(() => Missoes, { foreignKey: "id_missao", as: "missao" })
  missao: Missoes;

  @ForeignKey(() => Lances)
  @AllowNull(false)
  @NotNull
  @Comment("ID do lance durante o qual foi capturada a fauna acidental")
  @Column(DataType.BIGINT)
  id_lance: number;

  @BelongsTo(() => Lances, { foreignKey: "id_lance", as: "lance" })
  lance: Lances;

  @ForeignKey(() => Especies)
  @AllowNull(false)
  @NotNull
  @Comment("ID da espécie capturada acidentalmente")
  @Column(DataType.BIGINT)
  id_especie: number;

  @BelongsTo(() => Especies, { foreignKey: "id_especie", as: "especie" })
  especie: Especies;

  @AllowNull(false)
  @NotNull
  @Comment("Classificação do tipo de fauna: ave, espécies marinhas protegidas, tartaruga, mamífero marinho, outro")
  @Column({
    type: DataType.ENUM(...Object.values(GrupoIncidente)),
  })
  grupo: GrupoIncidente;

  @AllowNull(false)
  @Default(0)
  @Comment("Quantidade de indivíduos capturados vivos")
  @Column(DataType.INTEGER)
  quantidade_vivos: number;

  @AllowNull(false)
  @Default(0)
  @Comment("Quantidade de indivíduos capturados mortos")
  @Column(DataType.INTEGER)
  quantidade_mortos: number;

  @AllowNull(true)
  @Comment("Observações adicionais sobre o incidente ou ação tomada")
  @Column(DataType.TEXT)
  observacao: string | null;

  @Comment('Identificador gerado pelo cliente para correlação em uso offline')
  @AllowNull(false)
  @Unique
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  client_record_id: string;

  @Comment('Versão do registro, usada para controle de concorrência otimista')
  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  versao: number;

  @CreatedAt
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em: Date | null;
}
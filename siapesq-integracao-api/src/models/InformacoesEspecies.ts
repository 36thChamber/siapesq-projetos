import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AllowNull,
  NotNull,
  DataType,
  Default,
  UpdatedAt,
  DeletedAt,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  CreatedAt,
} from "sequelize-typescript";
import especies from "./Especies";
import artigos from "./Artigos";
import informacoesEspeciesArtigos from "./InformacoesEspeciesArtigos";

@Table({
  tableName: "informacoes_especies",
  schema: "siapesq",
  hooks: {
    afterUpdate: (informacoesEspecies) => {
      informacoesEspecies.updatedAt = new Date();
    },
  },
})
export default class informacoesEspecies extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id_informacaoespecie: string;

  @ForeignKey(() => especies)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: "id_especie",
  })
  id_especie: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  tipo_informacao: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  informacao: string;
  
  @CreatedAt
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em: Date;

  @BelongsTo(() => especies, {
    foreignKey: "id_especie",
    targetKey: "id_especie",
  })
  especie: especies;

  @BelongsToMany(() => artigos, () => informacoesEspeciesArtigos)
  artigos: artigos[];
}

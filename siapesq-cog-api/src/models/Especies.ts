import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AllowNull,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
  CreatedAt,
  DeletedAt,
  UpdatedAt,
  HasMany,
} from "sequelize-typescript";
import gruposEspecies from "./GrupoEspecies";
import informacoesEspecies from "./InformacoesEspecies";

@Table({
  tableName: "especies",
  schema: "siapesq",
  hooks: {
    afterUpdate: (especies) => {
      especies.updatedAt = new Date();
    },
  },
})
export default class especies extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    field: "id_especie",
  })
  id_especie: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  nome: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  nome_cientifico: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  pesquisador: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  descricao: string;

  @ForeignKey(() => gruposEspecies)
  @Column(DataType.UUID)
  id_gruposespecies: string;

  @BelongsTo(() => gruposEspecies)
  grupoespecie: gruposEspecies;

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

  @HasMany(() => informacoesEspecies, {
    as: "informacoesEspecies",
    foreignKey: "id_especie",
  })
  informacoesEspecies: informacoesEspecies[];
}

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
  CreatedAt,
} from "sequelize-typescript";
import especies from "./Especies";

@Table({
  tableName: "informacoesEspecies",
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

  @AllowNull(false)
  @Column(DataType.STRING)
  fonte_referencia: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  link_fonte: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  referencia_texto: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  referencia_completa: string;
  
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

  @BelongsTo(() => especies, {
    foreignKey: "id_especie",
    targetKey: "id_especie",
  })
  especie: especies;
}

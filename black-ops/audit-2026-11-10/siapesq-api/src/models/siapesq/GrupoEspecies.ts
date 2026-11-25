import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AllowNull,
  DataType,
  CreatedAt,
  Default,
  DeletedAt,
  UpdatedAt,
  HasMany,
} from "sequelize-typescript";
import especies from "./Especies";

@Table({
  tableName: "gruposEspecies",
  schema: "siapesq",
  hooks: {
    afterUpdate: (gruposEspecies) => {
      gruposEspecies.updatedAt = new Date();
    },
  },
})
export default class gruposEspecies extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id_gruposespecies: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  nome: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  quantidade: number;

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

  @HasMany(() => especies, {
    as: "especies",
    foreignKey: "id_gruposespecies",
  })
  especies: especies[];
}

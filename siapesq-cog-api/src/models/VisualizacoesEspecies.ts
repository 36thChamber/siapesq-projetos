import {
  Table,
  Column,
  PrimaryKey,
  Default,
  CreatedAt,
  AllowNull,
  DataType,
  Model,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import usuarios from "./Usuarios";
import especies from "./Especies";

@Table({
  tableName: "visualizacoes_especies",
  schema: "siapesq",
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ["id_usuario", "id_especie"],
    },
  ],
})
export default class visualizacoes_especies extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id_visualizacao: string;

  @ForeignKey(() => usuarios)
  @AllowNull(false)
  @Column(DataType.UUID)
  id_usuario: string;

  @BelongsTo(() => usuarios)
  usuario: usuarios;

  @ForeignKey(() => especies)
  @AllowNull(false)
  @Column(DataType.UUID)
  id_especie: string;

  @BelongsTo(() => especies)
  especie: especies;

  @CreatedAt
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  criado_em: Date;
}

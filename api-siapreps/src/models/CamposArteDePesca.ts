// src/models/CamposArteDePesca.ts
import {
  AllowNull,
  AutoIncrement,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  Model,
  NotNull,
  PrimaryKey,
  Table,
  UpdatedAt,
  Comment,
  BelongsTo,
} from "sequelize-typescript";
import ArtesDePesca from "./ArtesDePesca";

@Table({
  schema: "siapreps",
  tableName: "campos_arte_de_pesca",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
})
export default class CamposArteDePesca extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @Comment("Id do campo de arte pesca, Obrigatório")
  @AllowNull(false)
  @NotNull
  @ForeignKey(() => ArtesDePesca)
  @Column(DataType.BIGINT)
  id_arte_pesca: number;

  @Comment("Nome do campo de arte pesca, Obrigatório")
  @AllowNull(false)
  @NotNull
  @Column(DataType.STRING)
  nome: string;

  @Comment("Tipo do campo de arte pesca, Opcional")
  @AllowNull(true)
  @Column(DataType.STRING)
  tipo: string | null;

  @Comment("Obrigatório do campo de arte pesca, Opcional")
  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  obrigatorio: boolean | null;

  @Comment("Ativo do campo de arte pesca, Opcional")
  @Default(true)
  @Column(DataType.BOOLEAN)
  ativo: boolean;

  @CreatedAt
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em: Date | null;

  @BelongsTo(() => ArtesDePesca)
  artePesca: ArtesDePesca;
}

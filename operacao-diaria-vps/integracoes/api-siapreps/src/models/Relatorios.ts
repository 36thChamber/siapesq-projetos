import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  Comment,
  CreatedAt,
  DataType,
  DeletedAt,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import Missoes from "./Missoes";
import Embarcacoes from "./Embarcacoes";
import Usuarios from "./Usuarios";

@Table({
  schema: "siapreps",
  tableName: "relatorios",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
})
export default class Relatorios extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @ForeignKey(() => Usuarios)
  @AllowNull(false)
  @Comment("ID do usuário responsável pelo relatório")
  @Column(DataType.BIGINT)
  id_usuario: number;

  @ForeignKey(() => Embarcacoes)
  @AllowNull(false)
  @Comment("ID da embarcação relacionada ao relatório")
  @Column(DataType.BIGINT)
  id_embarcacao: number;

  @ForeignKey(() => Missoes)
  @AllowNull(false)
  @Comment("ID da missão relacionada ao relatório")
  @Column(DataType.BIGINT)
  id_missao: number;

  @AllowNull(false)
  @Comment("URI do arquivo do relatório")
  @Column(DataType.STRING(2048))
  uri: string;

  @AllowNull(true)
  @Comment("Tipo do relatório")
  @Column(DataType.STRING)
  tipo: string | null;

  @CreatedAt
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em: Date | null;

  @BelongsTo(() => Usuarios, { foreignKey: "id_usuario", as: "usuario" })
  usuario: Usuarios;

  @BelongsTo(() => Embarcacoes, {
    foreignKey: "id_embarcacao",
    as: "embarcacao",
  })
  embarcacao: Embarcacoes;

  @BelongsTo(() => Missoes, { foreignKey: "id_missao", as: "missao" })
  missao: Missoes;
}

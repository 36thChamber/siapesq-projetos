import {
  AllowNull,
  AutoIncrement,
  Column,
  Comment,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "sequelize-typescript";
import UsuariosAtivos from "./UsuariosAtivos";
import Embarcacoes from "./Embarcacoes";

@Table({
  schema: "siapreps",
  tableName: "usuarios",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
})
export default class Usuarios extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @HasMany(() => UsuariosAtivos, {
    foreignKey: "id_usuario",
  })
  usuariosAtivos: UsuariosAtivos[];

  @HasMany(() => Embarcacoes)
  embarcacoes: Embarcacoes[];

  @AllowNull(false)
  @Column(DataType.STRING)
  nome: string;

  @Unique
  @Comment("Inscricao na Capitania dos Portos")
  @Column(DataType.STRING)
  insc_capt_portos: string;

  @Unique
  @AllowNull(false)
  @Comment("Pode ser tanto CPF quanto CNPJ")
  @Column(DataType.STRING)
  documento: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  email: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  senha: string;

  @AllowNull(false)
  @Comment("Formato esperado +DDI(DDD)XXXXXXXXX")
  @Column(DataType.STRING)
  telefone: string;

  @Default(false)
  @Comment("Campo para verificar se e administrador")
  @Column(DataType.BOOLEAN)
  administracao: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  ativo: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em?: Date;
}

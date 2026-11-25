import {
  Table,
  Column,
  PrimaryKey,
  Unique,
  Default,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  AllowNull,
  DataType,
  Model,
} from "sequelize-typescript";
import { TipoUsuario } from "./enums/tipoUsuarioEnum";
import { StatusUsuario } from "./enums/statususuarioEnum";

@Table({
  tableName: "usuarios",
  schema: "siapesq",
  hooks: {
    afterUpdate: (usuario) => {
      usuario.updatedAt = new Date();
    },
  },
})
export default class usuarios extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id_usuario: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  nome: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  email: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  senha: string;

  @Column(DataType.STRING)
  contato: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  cpf: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  titulo_cientifico: boolean;

  @AllowNull(false)
  @Default(TipoUsuario.PADRAO)
  @Column(DataType.ENUM(...Object.values(TipoUsuario)))
  tipo_usuario: TipoUsuario;

  @Default(false)
  @Column(DataType.BOOLEAN)
  email_verificado: boolean;

  @Column(DataType.DATE)
  ultimo_acesso: Date;

  @AllowNull(false)
  @Default(StatusUsuario.PENDENTE)
  @Column(DataType.ENUM(...Object.values(StatusUsuario)))
  status: StatusUsuario;

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

}

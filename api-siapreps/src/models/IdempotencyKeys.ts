import {
  AllowNull,
  AutoIncrement,
  Column,
  Comment,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";

import Usuarios from "./Usuarios";

@Table({
  schema: "siapreps",
  tableName: "idempotency_keys",
  timestamps: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  indexes: [
    {
      unique: true,
      name: "idx_idempotency_keys_usuario_escopo_chave",
      fields: ["id_usuario", "escopo", "chave"],
    },
  ],
})
export default class IdempotencyKeys extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @Comment("Valor do header Idempotency-Key enviado pelo cliente")
  @AllowNull(false)
  @Column(DataType.STRING)
  chave: string;

  @Comment("Identifica o comando/endpoint ao qual a chave se refere, ex: 'criar-missao'")
  @AllowNull(false)
  @Column(DataType.STRING)
  escopo: string;

  @ForeignKey(() => Usuarios)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  id_usuario: number;

  @Comment("Hash sha256 do corpo da requisição original")
  @AllowNull(false)
  @Column(DataType.STRING)
  hash_corpo: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  status_resposta: number;

  @AllowNull(false)
  @Column(DataType.JSONB)
  corpo_resposta: object;

  @AllowNull(false)
  @Column(DataType.DATE)
  expira_em: Date;

  @CreatedAt
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;
}

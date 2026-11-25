import {
  Table,
  Column,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  DataType,
  Model,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import usuarios from "./Usuarios";
import assinaturas from "./Assinaturas";
import { ProvedorPagamento } from "./enums/provedorPagamentoEnum";
import { StatusPagamento } from "./enums/statusPagamentosEnum";

@Table({
  tableName: "pagamentos",
  schema: "siapesq",
  hooks: {
    afterUpdate: (pagamento) => {
      pagamento.updatedAt = new Date();
    },
  },
})
export default class pagamentos extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id_pagamento: string;

  @ForeignKey(() => usuarios)
  @AllowNull(false)
  @Column(DataType.UUID)
  id_usuario: string;

  @BelongsTo(() => usuarios)
  usuario: usuarios;

  @ForeignKey(() => assinaturas)
  @AllowNull(true)
  @Column(DataType.UUID)
  id_assinatura: string;

  @BelongsTo(() => assinaturas)
  assinatura: assinaturas;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(ProvedorPagamento)))
  provedor_pagamento: ProvedorPagamento;

  @AllowNull(false)
  @Column(DataType.STRING)
  id_pagamento_provedor: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  id_fatura_provedor: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  valor: number;

  @AllowNull(false)
  @Default("BRL")
  @Column(DataType.STRING(10))
  moeda: string;

  @AllowNull(false)
  @Default(StatusPagamento.PENDENTE)
  @Column(DataType.ENUM(...Object.values(StatusPagamento)))
  status: StatusPagamento;

  @AllowNull(true)
  @Column(DataType.STRING)
  url_fatura: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  data_pagamento: Date;

  @CreatedAt
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;
}
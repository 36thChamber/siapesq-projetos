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
import planos from "./Planos";
import { StatusAssinatura } from "./enums/statusAssinaturasEnum";

@Table({
  tableName: "assinaturas",
  schema: "siapesq",
  hooks: {
    afterUpdate: (assinatura) => {
      assinatura.updatedAt = new Date();
    },
  },
})
export default class assinaturas extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id_assinatura: string;

  @ForeignKey(() => usuarios)
  @AllowNull(false)
  @Column(DataType.UUID)
  id_usuario: string;

  @BelongsTo(() => usuarios)
  usuario: usuarios;

  @ForeignKey(() => planos)
  @AllowNull(false)
  @Column(DataType.UUID)
  id_plano: string;

  @BelongsTo(() => planos)
  plano: planos;

  @AllowNull(false)
  @Default(StatusAssinatura.TRIAL)
  @Column(DataType.ENUM(...Object.values(StatusAssinatura)))
  status: StatusAssinatura;

  @AllowNull(false)
  @Column(DataType.DATE)
  data_inicio: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  data_fim: Date;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  renovacao_automatica: boolean;

  @Column(DataType.STRING)
  provedor_pagamento: string;

  @Column(DataType.STRING)
  id_assinatura_externa: string;

  @CreatedAt
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;
}
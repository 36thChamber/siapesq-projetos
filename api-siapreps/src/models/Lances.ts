import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  Comment,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  Model,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "sequelize-typescript";

import { LanceStatus } from './enums/lance-status.enum';

import Missoes from "./Missoes";
import Fundos from "./Fundos";
import Iscas from "./Iscas";

@Table({
  schema: "siapreps",
  tableName: "lances",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
})
export default class Lances extends Model {
  @Comment("Id do lance")
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @Comment('Id do Usuario (Herdado da tabela "Usuarios"), Obrigatório')
  @AllowNull(false)
  @NotNull
  @ForeignKey(() => Missoes)
  @Column(DataType.BIGINT)
  id_missao: number;

  @Comment("Número referente ao Lance realizado, Obrigatório")
  @AllowNull(false)
  @NotNull
  @Column(DataType.INTEGER)
  numero_lance: number;

  @Comment("Data em que o lance foi realizado, Obrigatório")
  @AllowNull(false)
  @NotNull
  @Column(DataType.DATE)
  lancado_em: Date;

  @Comment("Data em que o lance foi recolhido, Opcional")
  @AllowNull(true)
  @Column(DataType.DATE)
  recolhido_em: Date | null;

  @Comment("Horário observado em campo ao lançar, quando fornecido pelo cliente")
  @AllowNull(true)
  @Column(DataType.DATE)
  lancado_em_observado: Date | null;

  @Comment("Horário observado em campo ao recolher, quando fornecido pelo cliente")
  @AllowNull(true)
  @Column(DataType.DATE)
  recolhido_em_observado: Date | null;

  @Comment('Id do Fundo (Herdado da tabela "Fundos"), Opcional')
  @AllowNull(true)
  @ForeignKey(() => Fundos)
  @Column(DataType.BIGINT)
  id_fundo: number | null;

  @Comment('Id do Isca (Herdado da tabela "Iscas"), Opcional')
  @AllowNull(true)
  @ForeignKey(() => Iscas)
  @Column(DataType.BIGINT)
  id_isca: number | null;

  @AllowNull(false)
  @Default(LanceStatus.EM_ANDAMENTO)
  @Column({
    type: DataType.ENUM(...Object.values(LanceStatus)),
  })
  status: LanceStatus;

  @Comment("Latitude de onde foi realizado o lance, Obrigatório")
  @AllowNull(false)
  @NotNull
  @Column(DataType.STRING)
  latitude_lancamento: string;

  @Comment("Longitude de onde foi realizado o lance, Obrigatório")
  @AllowNull(false)
  @NotNull
  @Column(DataType.STRING)
  longitude_lancamento: string;

  @Comment("Latitude de onde foi recolhido, Opcional")
  @AllowNull(true)
  @Column(DataType.STRING)
  latitude_recolhimento: string | null;

  @Comment("Longitude de onde foi recolhido, Opcional")
  @AllowNull(true)
  @Column(DataType.STRING)
  longitude_recolhimento: string | null;

  @AllowNull(true)
  @Comment("Dados específicos do lance em formato JSON, Opcional")
  @Column(DataType.JSONB)
  dados_especificos: object | null;

  @Default(true)
  @Column(DataType.BOOLEAN)
  ativo: boolean;

  @Comment('Identificador gerado pelo cliente para correlação em uso offline')
  @AllowNull(false)
  @Unique
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  client_record_id: string;

  @Comment('Versão do registro, usada para controle de concorrência otimista')
  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  versao: number;

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

  @BelongsTo(() => Missoes, { foreignKey: "id_missao", as: "missao" })
  missao: Missoes;

  @BelongsTo(() => Fundos, { foreignKey: "id_fundo", as: "fundo" })
  fundo: Fundos;

  @BelongsTo(() => Iscas, { foreignKey: "id_isca", as: "isca" })
  isca: Iscas;
}

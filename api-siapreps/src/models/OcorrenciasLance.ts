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

import Especies from "./Especies";
import Lances from "./Lances";

export type TipoOcorrenciaLance = "captura" | "descarte" | "incidental";

export const TIPOS_OCORRENCIA_LANCE: TipoOcorrenciaLance[] = [
  "captura",
  "descarte",
  "incidental",
];

@Table({
  schema: "siapreps",
  tableName: "ocorrencias_lance",
  timestamps: true,
  paranoid: true,
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  deletedAt: "deletado_em",
  indexes: [
    {
      name: "idx_ocorrencias_lance_id_lance_tipo",
      fields: ["id_lance", "tipo_ocorrencia"],
    },
  ],
})
export default class OcorrenciasLance extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @ForeignKey(() => Lances)
  @AllowNull(false)
  @NotNull
  @Comment("ID do lance relacionado a ocorrencia")
  @Column(DataType.BIGINT)
  id_lance: number;

  @BelongsTo(() => Lances, {
    foreignKey: "id_lance",
    as: "lance",
  })
  lance: Lances;

  @ForeignKey(() => Especies)
  @AllowNull(false)
  @NotNull
  @Comment("ID da especie relacionada a ocorrencia")
  @Column(DataType.BIGINT)
  id_especie: number;

  @BelongsTo(() => Especies, {
    foreignKey: "id_especie",
    as: "especie",
  })
  especie: Especies;

  @AllowNull(false)
  @NotNull
  @Comment("Tipo da ocorrencia: captura, descarte ou incidental")
  @Column({
    type: DataType.STRING,
    validate: {
      isIn: [TIPOS_OCORRENCIA_LANCE],
    },
  })
  tipo_ocorrencia: TipoOcorrenciaLance;

  @AllowNull(true)
  @Comment("Quantidade total registrada")
  @Column(DataType.INTEGER)
  quantidade?: number | null;

  @AllowNull(true)
  @Comment("Quantidade de individuos vivos")
  @Column(DataType.INTEGER)
  quantidade_vivos?: number | null;

  @AllowNull(true)
  @Comment("Quantidade de individuos mortos")
  @Column(DataType.INTEGER)
  quantidade_mortos?: number | null;

  @AllowNull(true)
  @Comment("Peso registrado")
  @Column(DataType.FLOAT)
  peso?: number | null;

  @AllowNull(true)
  @Comment("Observacoes adicionais")
  @Column(DataType.TEXT)
  observacao?: string | null;

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
  @Column(DataType.DATE)
  criado_em: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  atualizado_em: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletado_em?: Date | null;
}
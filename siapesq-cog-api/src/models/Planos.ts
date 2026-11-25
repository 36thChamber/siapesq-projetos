import {
  Table,
  Column,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  AllowNull,
  DataType,
  Model,
} from "sequelize-typescript";

@Table({
  tableName: "planos",
  schema: "siapesq",
  hooks: {
    afterUpdate: (plano) => {
      plano.updatedAt = new Date();
    },
  },
})
export default class planos extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id_plano: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  nome: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  periodicidade: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  especies_disponiveis: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  especies_ilimitadas: boolean;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  valor_mensal: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  valor_total: number;

  @AllowNull(false)
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
  deletado_em: Date;
}
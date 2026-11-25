import { Table, Model, PrimaryKey, AutoIncrement, Comment, Column, DataType, AllowNull, NotNull, Unique, CreatedAt, Default, DeletedAt, UpdatedAt, ForeignKey, HasMany } from "sequelize-typescript";
import Usuarios from "../Usuarios";
import Areas_Alertas from "./Areas_Alertas";
import Alertas from "./Alertas";

interface PosicaoData {
    latitude: string;
    longitude: string;
}

@Table({
    tableName: "Reservatorios",
    schema: "phytobloom",
    hooks: {
        afterUpdate: (reservatorio) => {
            reservatorio.updatedAt = new Date()
        }
    }
})
export default class Reservatorios extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id: number;

    @ForeignKey(()=>Usuarios)
    @AllowNull(false)
    @NotNull
    @Comment('Id do usuário que criou')
    @Column(DataType.BIGINT)
    id_usuario: number

    @Unique
    @AllowNull(false)
    @NotNull
    @Column(DataType.STRING)
    nome: string;

    @AllowNull(false)
    @NotNull
    @Column(DataType.NUMBER)
    prioridade: number;

    @AllowNull(false)
    @NotNull
    @Comment('Array de posições de reservatórios')
    @Column(DataType.ARRAY(DataType.JSONB)) // Use ARRAY do tipo JSONB para armazenar um array de objetos JSON
    posicoes: PosicaoData[]; // Array de objetos que segue a interface PosicaoData

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

    @HasMany(() => Areas_Alertas)
    areas_alertas?: Areas_Alertas[];

    @HasMany(() => Alertas)
    alertas?: Alertas[]
}

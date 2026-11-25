import { Table, Model, PrimaryKey, AutoIncrement, Comment, Column, DataType, AllowNull, NotNull, Unique, CreatedAt, Default, DeletedAt, UpdatedAt, ForeignKey, HasMany, BelongsTo } from "sequelize-typescript";
import Reservatorios from "./Reservatorios";
import Alertas from "./Alertas";

interface PosicaoData {
    latitude: string;
    longitude: string;
}

@Table({
    tableName: "Areas_Alertas",
    schema: "phytobloom",
    hooks: {
        afterUpdate: (alerta) => {
            alerta.updatedAt = new Date()
        }
    }
})
export default class Areas_Alertas extends Model {
    
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id: number;

    @ForeignKey(()=>Reservatorios)
    @AllowNull(false)
    @NotNull
    @Comment("Reservátorio que o alerta foi feito")
    @Column(DataType.BIGINT)
    id_reservatorio: number

    @AllowNull(false)
    @NotNull
    @Column(DataType.STRING)
    nome: string;

    @AllowNull(false)
    @NotNull
    @Comment("Array tridimensional de posições de reservatórios, contendo arrays de coordenadas")
    @Column(DataType.ARRAY(DataType.JSONB)) // Use ARRAY do tipo JSONB para armazenar um array de objetos JSON
    regiao_alerta: PosicaoData[];

    @CreatedAt
    @Default(new Date())
    @Column(DataType.DATE)
    createdAt: Date;

    @UpdatedAt
    @Column(DataType.DATE)
    updatedAt: Date;

    @HasMany(() => Alertas, { foreignKey: 'id_area_alerta', as: 'alertas' })
    alertas: Alertas[];

    @BelongsTo(() => Reservatorios, {
        foreignKey: 'id_reservatorio',
        as: 'reservatorio'
    })
    reservatorio?: Reservatorios; 

}

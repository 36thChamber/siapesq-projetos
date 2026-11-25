import { Table, Model, PrimaryKey, AutoIncrement, Comment, Column, DataType, AllowNull, NotNull, Unique, CreatedAt, Default, DeletedAt, UpdatedAt, ForeignKey, BelongsTo } from "sequelize-typescript";
import Reservatorios from "./Reservatorios";
import Servidores from "./Servidores";
import Usuarios from "../Usuarios";
import Areas_Alertas from "./Areas_Alertas";

@Table({
    tableName: "Alertas",
    schema: "phytobloom",
    hooks: {
        afterUpdate: (alerta) => {
            alerta.updatedAt = new Date()
        }
    }
})
export default class Alertas extends Model {
    
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id: number;

    @ForeignKey(()=>Usuarios)
    @AllowNull(true)
    @Comment("Perfil que o alerta foi feito")
    @Column(DataType.BIGINT)
    id_usuario: number

    @ForeignKey(()=>Reservatorios)
    @AllowNull(false)
    @NotNull
    @Comment("Reservátorio que o alerta foi feito")
    @Column(DataType.BIGINT)
    id_reservatorio: number

    @BelongsTo(() => Reservatorios, { as: 'reservatorio' })
    reservatorio: Reservatorios;

    @ForeignKey(()=>Areas_Alertas)
    @AllowNull(true)
    @Comment('Responsável pelo alerta (Quem criou')
    @Column(DataType.BIGINT)
    id_area_alerta: number

    @BelongsTo(() => Areas_Alertas, { as: 'area_alerta' })
    area_alerta: Areas_Alertas;

    @AllowNull(false)
    @NotNull
    @Comment("Data do alerta")
    @Column(DataType.DATE)
    data_alerta: Date

    @AllowNull(false)
    @NotNull
    @Comment("Hora do alerta")
    @Column(DataType.DATE)
    hora_alerta: Date

    @AllowNull(false)
    @NotNull
    @Comment('Nível crítico (Grau de cobertura da planta)')
    @Column(DataType.STRING)
    nivel_critico: string
    
    @AllowNull(false)
    @NotNull
    @Default('NDVI')
    @Comment('Tipo de source do alerta(NDVI,NDCI,TSI)')
    @Column(DataType.STRING)
    tipo: string

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

    @BelongsTo(() => Areas_Alertas, {
        foreignKey: 'id_area_alerta',
        as: 'areas_alertas'
    })
    areas_alertas?: Areas_Alertas;

    @BelongsTo(() => Reservatorios, {
        foreignKey: 'id_reservatorio',
        as: 'reservatorios'
    })
    reseravtorios?: Reservatorios; 
}

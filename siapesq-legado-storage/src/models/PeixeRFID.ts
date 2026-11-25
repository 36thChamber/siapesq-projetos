import { Table, Column, Model, PrimaryKey, AutoIncrement, ForeignKey, Comment, AllowNull, DataType, BelongsTo } from 'sequelize-typescript';
import Lances from './Lances';
import Especies from './Especies';

@Table({
    tableName: "PeixeRFID",
    timestamps: false
})
export default class PeixeRFID extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id: number;

    @ForeignKey(() => Especies)
    @Column(DataType.BIGINT)
    id_especie: number;

    @ForeignKey(() => Lances)
    @Column(DataType.BIGINT)
    id_lance: number;

    @AllowNull(false)
    @Comment("Latitude")
    @Column(DataType.FLOAT)
    latitude: number;

    @AllowNull(false)
    @Comment("Longitude")
    @Column(DataType.FLOAT)
    longitude: number;

    @AllowNull(false)
    @Comment("Hex")
    @Column(DataType.STRING)
    hex: string;

    @AllowNull(false)
    @Comment("Data de criação")
    @Column(DataType.DATE)
    created: Date;

    @AllowNull(false)
    @Comment("Flag de exclusão")
    @Column(DataType.BOOLEAN)
    deleted: boolean;

    @BelongsTo(() => Especies, 'id_especie')
    especie: Especies;

    @BelongsTo(() => Lances, 'id_lance')
    lance: Lances;
}

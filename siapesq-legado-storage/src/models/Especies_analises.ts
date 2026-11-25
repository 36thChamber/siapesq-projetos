import { Table, Column, Model, PrimaryKey, AutoIncrement, Unique, NotNull, Comment, AllowNull, DataType } from 'sequelize-typescript';

@Table({
    tableName:"Especies_analises",
    timestamps: false,
})

export default class Especies_analises extends Model {
    
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id: number;

    @Unique
    @AllowNull(false)
    @NotNull    
    @Comment("Nome comum da especie com analise TIF")
    @Column(DataType.STRING)
    nome_padrao: string;

    @Unique
    @AllowNull(false)
    @NotNull
    @Comment("Nome cientifico usado no arquivo TIF")
    @Column(DataType.STRING)
    nome_cientifico: string;
    
}
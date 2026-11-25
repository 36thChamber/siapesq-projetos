import { Table, Column, Model,  Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, ForeignKey } from 'sequelize-typescript';
import Especies from './Especies';
import Lances from './Lances';
@Table({
    tableName:"EspecieDescartes",
    hooks:{
        afterUpdate:(especie_descartes)=>{
            especie_descartes.updatedAt = new Date()
        }
    }
})
export default class EspecieDescartes extends Model {
    
    @ForeignKey(()=>Especies)
    @AllowNull(false)
    @NotNull
    @Comment("Id da Especie")
    @Column(DataType.BIGINT) 
    id_especie:number;
    
    @ForeignKey(()=>Lances)
    @AllowNull(false)
    @NotNull
    @Comment("Id do Lance")
    @Column(DataType.BIGINT) 
    id_lance:number;


    @AllowNull(false)
    @NotNull
    @Comment("Quantidade de Especies vivas descartadas")
    @Column(DataType.BIGINT) 
    n_de_vivos:number;

    @AllowNull(false)
    @NotNull
    @Comment("Quantidade de Especies mortas descartadas")
    @Column(DataType.BIGINT) 
    n_de_mortos:number;

    @Default(false)
    @AllowNull(false)
    @NotNull
    @Comment("Informando se especie for pega acidentalmente ou não")
    @Column(DataType.BOOLEAN)
    acidental: boolean;


    @Default(true)
    @Column(DataType.BOOLEAN)
    ativo: boolean;

    @CreatedAt
    @Default(new Date())
    @Column(DataType.DATE)
    criado_em:Date;

    @UpdatedAt
    @Column(DataType.DATE)
    atualizado_em:Date;

    @DeletedAt
    @Column(DataType.DATE)
    deletado_em:Date;

}
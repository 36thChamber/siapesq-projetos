import { Table, Column, Model,  Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, ForeignKey } from 'sequelize-typescript';
import Especies from './Especies';
import Lances from './Lances';
@Table({
    tableName:"EspecieLance",
    hooks:{
        afterUpdate:(especie_lance)=>{
            especie_lance.updatedAt = new Date()
        }
    }
})
export default class EspecieLance extends Model {
    
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
    @Comment("Quantidade (KG) da Especie recolhida no lance")
    @Column(DataType.BIGINT) 

    peso:number;
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
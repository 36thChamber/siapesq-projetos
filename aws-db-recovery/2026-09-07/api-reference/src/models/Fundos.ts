import { Table, Column, Model, PrimaryKey, AutoIncrement, Unique, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, HasMany } from 'sequelize-typescript';
import Lances from './Lances';
@Table({
    tableName:"Fundos",
    hooks:{
        afterUpdate:(fundo)=>{
            fundo.updatedAt = new Date()
        }
    }
})
export default class Fundos extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;

    @HasMany(()=>Lances)
    lances:Lances[]
    
    @Unique
    @AllowNull(false)
    @NotNull
    @Comment("Nome do porto")
    @Column(DataType.STRING) 
    nome:string;

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
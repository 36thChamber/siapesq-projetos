import { Table, Column, Model, PrimaryKey, AutoIncrement, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, HasMany } from 'sequelize-typescript';
import Lances from './Lances';
@Table({
    tableName:"Armadilhas",
    hooks:{
        afterUpdate:(armadilha)=>{
            armadilha.updatedAt = new Date()
        }
    }
})
export default class Armadilhas extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;
    
    @HasMany(()=>Lances)
    lances:Lances[]
    
    @AllowNull(false)
    @NotNull
    @Comment("Modelo de Armadilha")
    @Column(DataType.STRING) 
    modelo:string;
     
    @AllowNull(false)
    @NotNull
    @Comment("Tipo de Armadilha")
    @Column(DataType.STRING) 
    tipo:string;
     
    @AllowNull(false)
    @NotNull
    @Comment("Forma da Armadilha")
    @Column(DataType.STRING) 
    forma:string;


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
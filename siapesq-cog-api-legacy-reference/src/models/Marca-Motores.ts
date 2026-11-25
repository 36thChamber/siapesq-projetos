import { Table, Column, Model, PrimaryKey,HasMany, AutoIncrement, Unique, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType } from 'sequelize-typescript';
import Motores from './Motores';
@Table({
    tableName:"MarcaMotores",
    hooks:{
        afterUpdate:(marca)=>{
            marca.updatedAt = new Date()
        }
    }
})
export default class MarcaMotores extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;
    
    @Unique
    @AllowNull(false)
    @NotNull
    @Comment("Nome da marca")
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

    @HasMany(() => Motores)
    motores: Motores[];

}
import { Table, Model, PrimaryKey, AutoIncrement, Column, Comment, DataType, AllowNull, NotNull, Unique, CreatedAt, Default, DeletedAt, UpdatedAt, Not, ForeignKey } from "sequelize-typescript";
import Usuarios from "./Usuarios";

@Table({
    tableName:"Servidores",
    schema: "phytobloom",
    hooks:{
        afterUpdate:(servidor)=>{
            servidor.updatedAt = new Date()
        }
    }
})
export default class Servidores extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;

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
    nome:string

    @Unique
    @AllowNull(false)
    @NotNull
    @Column(DataType.STRING)
    cpf:string

    @AllowNull(false)
    @NotNull
    @Column(DataType.STRING)
    email: string;

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
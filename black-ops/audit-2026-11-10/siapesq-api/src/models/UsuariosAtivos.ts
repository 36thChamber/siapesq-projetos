import { allow } from 'joi';
import { Table, Column, Model, PrimaryKey, AutoIncrement, Unique, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, HasMany, ForeignKey } from 'sequelize-typescript';
import Usuarios from './Usuarios';
@Table({
    tableName:"UsuariosAtivos",
    timestamps: false
})
export default class UsuariosAtivos extends Model {

    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;

    @ForeignKey(()=>Usuarios)
    @AllowNull(false)
    @NotNull
    @Comment("Id do Usuário")
    @Column(DataType.BIGINT) 
    id_user:number;
    
    @AllowNull(false)
    @Column(DataType.STRING)
    email:string;

    @AllowNull(false)
    @Column(DataType.STRING)
    telefone:string;
    
    @AllowNull(false)
    @Column(DataType.STRING)
    ativo:boolean;

    @AllowNull(false)
    @Column(DataType.STRING)
    tipo_assinatura:string;
    
    @CreatedAt
    @Default(new Date())
    @Column(DataType.DATE)
    data_criacao:Date;
    
    @AllowNull(false)
    @Column(DataType.DATE)
    data_fim:Date;
}
import { Table, Model, PrimaryKey, AutoIncrement, Column, Comment, DataType, AllowNull, NotNull, Unique, CreatedAt, Default, DeletedAt, UpdatedAt } from "sequelize-typescript";

@Table({
    tableName:"Usuarios",
    schema: "phytobloom",
    hooks:{
        afterUpdate:(usuario)=>{
            usuario.updatedAt = new Date()
        }
    }
})
export default class Usuarios extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;
 
    @Unique
    @AllowNull(false)
    @NotNull
    @Column(DataType.STRING)
    nome:string

    @Unique
    @AllowNull(false)
    @NotNull
    @Column(DataType.STRING)
    documento:string

    @AllowNull(false)
    @NotNull
    @Column(DataType.STRING)
    email: string;
    
    @AllowNull(false)
    @NotNull
    @Column(DataType.STRING)
    senha: string;
    
    @AllowNull(false)
    @NotNull
    @Comment("Formato esperado +DDI(DDD)XXXXXXXXX")
    @Column(DataType.STRING)
    telefone: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    ativo: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    user_verify: boolean;

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
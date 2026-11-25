import { Table, Column, Model, PrimaryKey, AutoIncrement, ForeignKey, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType } from 'sequelize-typescript';
import Usuarios from './Usuarios';
import Embarcacoes from './Embarcacoes';
@Table({
    tableName:"Relatorios",
    hooks:{
        afterUpdate:(relatorio)=>{
            relatorio.updatedAt = new Date()
        }
    }
})
export default class Relatorios extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;
    
    @AllowNull(false)
    @NotNull
    @Comment("Nome do Relatorio")
    @Column(DataType.STRING) 
    nome:string;

    @AllowNull(false)
    @NotNull
    @Comment("URI do arquivo na AWS")
    @Column(DataType.STRING) 
    uri:string;

    @ForeignKey(()=>Usuarios)
    @Column(DataType.BIGINT) 
    id_usuario:number;

    @ForeignKey(()=>Embarcacoes)
    @Column(DataType.BIGINT) 
    id_embarcacao:number;

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
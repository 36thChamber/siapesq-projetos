import { Table, Column, Model, PrimaryKey, AutoIncrement, Unique, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, HasMany } from 'sequelize-typescript';
import Embarcacoes from './Embarcacoes';
import Relatorios from './Relatorios';
@Table({
    tableName:"Usuarios",
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

    @HasMany(()=>Embarcacoes)
    embarcacoes:Embarcacoes[]
    
    @HasMany(()=>Relatorios)
    relatorios:Relatorios[]

    @AllowNull(false)
    @NotNull
    @Column(DataType.STRING)
    nome: string;

    @Unique
    @Comment("Inscrição na Captania dos Portos")
    @Column(DataType.STRING)
    insc_capt_portos: string;

    @Unique
    @AllowNull(false)
    @NotNull
    @Comment("Pode ser tanto CPF quando CNPJ")
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
    @Comment("Campo para verificar se é administrador")
    @Column(DataType.BOOLEAN)
    administracao: boolean;

    @Default(false)
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
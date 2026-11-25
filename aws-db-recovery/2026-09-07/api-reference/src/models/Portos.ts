import { Table, Column, Model, PrimaryKey, AutoIncrement, Unique, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, BelongsToMany } from 'sequelize-typescript';
import Embarcacoes from './Embarcacoes';
import EntradaPortos from './EntradaPortos';
import SaidaPortos from './SaidaPortos';
@Table({
    tableName:"Portos",
    hooks:{
        afterUpdate:(porto)=>{
            porto.updatedAt = new Date()
        }
    }
})
export default class Portos extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;

    //@BelongsToMany(() => Embarcacoes, () => EntradaPortos)
    //entrada_embarcacoes: Embarcacoes[];
    
    //@BelongsToMany(() => Embarcacoes, () => SaidaPortos)
    //saida_embarcacoes: Embarcacoes[];
    
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
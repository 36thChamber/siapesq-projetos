import { Table, Column, Model, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, ForeignKey,PrimaryKey,AutoIncrement } from 'sequelize-typescript';
import Embarcacoes from './Embarcacoes';
import Portos from './Portos';
@Table({
    tableName:"EntradaPortos",
    hooks:{
        afterUpdate:(entrada_porto)=>{
            entrada_porto.updatedAt = new Date()
        }
    }
})
export default class EntradaPortos extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;
    

    //@ForeignKey(()=>Embarcacoes)
    @AllowNull(false)
    @NotNull
    @Comment("id da Embarcação que realizou a entrada")
    @Column(DataType.BIGINT) 
    id_embarcacao:number;
    
    //@ForeignKey(()=>Portos)
    @AllowNull(false)
    @NotNull
    @Comment("id do Porto que a embarcação entrou")
    @Column(DataType.BIGINT) 
    id_porto:number


    @AllowNull(false)
    @NotNull
    @Default(new Date())
    @Comment("Data de entrada da embarcação no porto")
    @Column(DataType.DATE) 
    entrada:Date;


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
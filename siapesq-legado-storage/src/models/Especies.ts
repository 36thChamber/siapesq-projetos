import { Table, Column, Model, PrimaryKey, AutoIncrement, Unique, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, BelongsToMany } from 'sequelize-typescript';
import Lances from './Lances';
import EspecieLance from './EspecieLance';
import Missoes from './Missoes';
import EspecieMissaoAlvo from './EspecieMissaoAlvo';
@Table({
    tableName:"Especies",
    hooks:{
        afterUpdate:(especie)=>{
            especie.updatedAt = new Date()
        }
    }
})
export default class Especies extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;

    @BelongsToMany(()=>Lances,()=>EspecieLance)
    especie_lances:Lances[]

    @BelongsToMany(()=>Missoes,()=>EspecieMissaoAlvo)
    especie_missoes_alvo:Missoes[]
    
    @Unique
    @AllowNull(false)
    @NotNull
    @Comment("Especie do pescado")
    @Column(DataType.STRING) 
    nome:string;
    
    @Comment("URL Image da especie")
    @Column(DataType.STRING) 
    imagem:string;


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
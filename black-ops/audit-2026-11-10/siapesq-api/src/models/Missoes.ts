import { Table, Column, Model, PrimaryKey, AutoIncrement, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, ForeignKey, BelongsTo, HasMany, BelongsToMany } from 'sequelize-typescript';
import Embarcacoes from './Embarcacoes';
import Lances from './Lances';
import Especies from './Especies';
import EspecieMissaoAlvo from './EspecieMissaoAlvo';
import ArtesDePesca from './ArtesDePesca';
@Table({
    tableName:"Missoes",
    hooks:{
        afterUpdate:(missao)=>{
            missao.updatedAt = new Date()
        }
    }
})
export default class Missoes extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;

    @HasMany(()=>Lances)
    lances:Lances[]    
    
    @BelongsToMany(()=>Especies,()=>EspecieMissaoAlvo)
    especie_missoes_alvo:Especies[]
    
    @ForeignKey(()=>Embarcacoes)
    @AllowNull(false)
    @NotNull
    @Comment("ID da embarcacao que realizou a missao")
    @Column(DataType.BIGINT) 
    id_embarcacao:number;

    @ForeignKey(()=>ArtesDePesca)
    @AllowNull(false)
    @NotNull
    @Comment("Arte de Pesca da embarcação")
    @Column(DataType.BIGINT)
    id_arte_de_pesca:number;

    @BelongsTo(()=>ArtesDePesca)
    arte_de_pesca:ArtesDePesca;
    
    @AllowNull(false)
    @NotNull
    @Comment("Nome do Armador que é exibido no mapa de bordo")
    @Column(DataType.STRING)
    nome_armador:string
    
    @BelongsTo(()=>Embarcacoes)
    embarcacao:Embarcacoes

    @AllowNull(false)
    @NotNull
    @Comment("Marca Data de Inicio da Missão")
    @Column(DataType.DATE) 
    iniciou_em:Date

    @AllowNull(false)
    @NotNull
    @Comment("Marca Data de Termino da Missão")
    @Column(DataType.DATE) 
    terminou_em:Date

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
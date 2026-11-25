import { Table, Column, Model, PrimaryKey, AutoIncrement, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, ForeignKey, BelongsTo, BelongsToMany } from 'sequelize-typescript';

import ArtesDePesca from './ArtesDePesca';
import Fundos from './Fundos';
import Iscas from './Iscas';
import Missoes from './Missoes';
import Especies from './Especies';
import EspecieLance from './EspecieLance';
import Armadilhas from './Armadilhas';
import EspecieDescartes from './EspecieDescartes';

@Table({
    tableName:"Lances",
    hooks:{
        afterUpdate:(lance)=>{
            lance.updatedAt = new Date()
        }
    }
})
export default class Lances extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;

    @BelongsToMany(()=>Especies,()=>EspecieLance)
    especie_lances:Especies[]
    
    @BelongsToMany(()=>Especies,()=>EspecieDescartes)
    especie_descartes:Especies[]

    @ForeignKey(()=>Missoes)
    @AllowNull(false)
    @NotNull
    @Comment("Id da Missao que o lance foi realizado")
    @Column(DataType.BIGINT)
    id_missao:number;
    
    @BelongsTo(()=>Missoes)
    missao:Missoes

    @ForeignKey(()=>Fundos)
    @Comment("[Armadilha]Id do fundo do lance")
    @Column(DataType.BIGINT)
    id_fundo:number;

    @BelongsTo(()=>Fundos)
    fundo:Fundos

    @ForeignKey(()=>Iscas)
    @Comment("[Armadilha|Espinhel]Id da isca utilizada no lance")
    @Column(DataType.BIGINT)
    id_isca:number;
    
    @BelongsTo(()=>Iscas)
    isca:Iscas

    @ForeignKey(()=>Armadilhas)
    @Comment("Id da Armadilha utilizada no lance")
    @Column(DataType.BIGINT)
    id_armadilha:number;
    
    @BelongsTo(()=>Armadilhas)
    armadilha:Armadilhas

    @ForeignKey(()=>ArtesDePesca)
    @Comment("Id da Arte de pesca utilizada no lance")
    @Column(DataType.BIGINT)
    id_arte:number;
    
    @BelongsTo(()=>ArtesDePesca)
    arte:ArtesDePesca

    
    @AllowNull(false)
    @NotNull
    @Comment("Data do Lançamento das armadilhas")
    @Column(DataType.DATE)
    lancado_em:Date;
    
    @AllowNull(false)
    @NotNull
    @Comment("Data de Recolha das Armadilhas")
    @Column(DataType.DATE)
    recolhido_em:Date

    @AllowNull(false)
    @NotNull
    @Comment("Latitude do Lançamento das armadilhas(CRS=WGS84)")
    @Column(DataType.STRING)
    latitude_lancamento:string
    
    @AllowNull(false)
    @NotNull
    @Comment("Longitude do Lançamento das armadilhas(CRS=WGS84)")
    @Column(DataType.STRING)
    longitude_lancamento:string


    @AllowNull(false)
    @NotNull
    @Comment("Latitude do Recolhimento das armadilhas(CRS=WGS84)")
    @Column(DataType.STRING)
    latitude_recolhimento:string
    
    @AllowNull(false)
    @NotNull
    @Comment("Longitude do Recolhimento das armadilhas(CRS=WGS84)")
    @Column(DataType.STRING)
    longitude_recolhimento:string

    @AllowNull(true)
    @Comment("[Armadilha]Número de Armadilhas lançadas no lance")
    @Column(DataType.INTEGER)
    n_lance_armadilhas:number

    @AllowNull(true)
    @Comment("[Armadilha]Número de armadilhas recolhidas no lance")
    @Column(DataType.INTEGER)
    n_recolha_armadilhas:number

    @AllowNull(true)
    @Comment("[Espinhel]Número de anzois lançados no lance")
    @Column(DataType.INTEGER)
    n_lance_anzois:number

    @AllowNull(true)
    @Comment("[Espinhel]Número de samburas lançadas no lance")
    @Column(DataType.INTEGER)
    n_lance_samburas:number

    @AllowNull(true)
    @Comment("[Espinhel]Número de anzois recolhidos no lance ao recolher")
    @Column(DataType.INTEGER)
    n_recolha_anzois:number

    @AllowNull(true)
    @Comment("[Espinhel] Número de samburas lançadas no lance ao recolher")
    @Column(DataType.INTEGER)
    n_recolha_samburas:number

    @AllowNull(true)
    @Comment("[Espinhel|Cerco]Temperatura da superficie")
    @Column(DataType.INTEGER)
    temperatura_superficie:number

    @AllowNull(true)
    @Comment("[Espinhel|Cerco]Temperatura da superficie ao recolher")
    @Column(DataType.INTEGER)
    temperatura_superficie_recolha:number

    @AllowNull(true)
    @Comment("[Espinhel]Se foi usado o light-stick")
    @Column(DataType.BOOLEAN)
    light_stick:boolean
    
    @AllowNull(true)
    @Comment("[Emalha]Comprimento total da rede")
    @Column(DataType.INTEGER)
    comprimento_total_rede:number

    @AllowNull(true)
    @Comment("[Emalha]Altura total da rede")
    @Column(DataType.INTEGER)
    altura_total_rede:number
    
    @AllowNull(true)
    @Comment("[Emalha]Tamanho da malha da rede")
    @Column(DataType.INTEGER)
    tamanho_malha:number

  

    @AllowNull(true)
    @Comment("[Cerco] Tempo em minutos de procura")
    @Column(DataType.INTEGER)
    tempo_procura_minutos:number


    @AllowNull(false)
    @NotNull
    @Comment("Profundidade Do Lance(metros)")
    @Column(DataType.INTEGER)
    profundidade:number

    @Comment("Profundidade Do Lance(metros) ao recolher")
    @Column(DataType.INTEGER)
    profundidade_recolha:number

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
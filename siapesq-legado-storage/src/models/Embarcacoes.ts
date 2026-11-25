import { Table, Column, Model, PrimaryKey, AutoIncrement, BelongsToMany, Unique, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, ForeignKey, BelongsTo, HasMany, HasOne } from 'sequelize-typescript';
import Portos from './Portos';
import EntradaPortos from './EntradaPortos';
import SaidaPortos from './SaidaPortos';
import Usuarios from './Usuarios';
import Missoes from './Missoes';
import Relatorios from './Relatorios';
@Table({
    tableName:"Embarcacoes",
    hooks:{
        afterUpdate:(embarcacao)=>{
            embarcacao.updatedAt = new Date()
        }
    }
})
export default class Embarcacoes extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;
    
    @HasMany(()=>Missoes)
    missoes:Missoes[]

    @HasMany(()=>Relatorios)
    relatorios:Relatorios[]

    //@BelongsToMany(() => Portos, () => EntradaPortos)
    //entrada_portos: Portos[];
    
    //@BelongsToMany(() => Portos, () => SaidaPortos)
    //saida_portos: Portos[];

    @AllowNull(false)
    @NotNull
    @Comment("Nome da embarcação")
    @Column(DataType.STRING) 
    nome:string;

    @Unique
    @AllowNull(false)
    @NotNull
    @Comment("RGP da embarcação")
    @Column(DataType.STRING) 
    RGP:string;

    @ForeignKey(()=>Usuarios)
    @AllowNull(false)
    @NotNull
    @Comment("ID do Usuario Mestre da Embarcacao")
    @Column(DataType.BIGINT) 
    id_mestre:number;

    @BelongsTo(()=>Usuarios)
    mestre:Usuarios
    

    @AllowNull(true)
    @Comment("Tamanho do barco(não sei no que é medido)")
    @Column(DataType.STRING)
    tamanho:string;

    @AllowNull(true)
    @Comment("Capacidade de estocagem do barco(KG)")
    @Column(DataType.BIGINT)
    capacidade_estocagem:number;

    @AllowNull(true)
    @Comment("Velocidade do barco ao longo da pescaria (Milha Nautica/h)")
    @Column(DataType.BIGINT)
    velocidade_pesca:number;

    @AllowNull(true)
    @Comment("Velocidade Média de Cruzeiro(Milha Nautica/h)")
    @Column(DataType.BIGINT)
    velocidade_cruzeiro:number;

    @AllowNull(true)
    @Comment("Modalidade de pesca da embarcação")
    @Column(DataType.STRING)
    modalidade_pesca:string;
    
    @AllowNull(true)
    @Comment("Área de pesca de embarcação")
    @Column(DataType.STRING)
    area_pesca:string;

    @AllowNull(true)
    @Comment("URL da Image da embarcação")
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
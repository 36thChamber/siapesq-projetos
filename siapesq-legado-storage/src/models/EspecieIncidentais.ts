import { Table, Column, Model,  Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, ForeignKey, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import Lances from './Lances';

@Table({
    tableName:"EspecieIncidentais",
    hooks:{
        afterUpdate:(especie_incidentais)=>{
            especie_incidentais.updatedAt = new Date()
        }
    }
})
export default class EspecieIncidentais extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;


    @ForeignKey(()=>Lances)
    @AllowNull(false)
    @NotNull
    @Comment("Id do Lance")
    @Column(DataType.BIGINT) 
    id_lance:number;

    @AllowNull(false)
    @NotNull
    @Comment("Nome da especie incidente")
    @Column(DataType.STRING) 
    nome_especie:string;

    
    @AllowNull(true)
    @Comment("Quantidade de captura incidentais")
    @Column(DataType.BIGINT) 
    quantidade:number;

    @AllowNull(true)
    @Comment("Quantidade de captura incidentais")
    @Column(DataType.BIGINT) 
    n_de_vivos:number;

    
    @AllowNull(true)
    @Comment("Quantidade de captura incidentais")
    @Column(DataType.BIGINT) 
    n_de_mortos:number;

    @Default(false)
    @AllowNull(false)
    @NotNull
    @Comment("Informando se especie for pega acidentalmente ou não")
    @Column(DataType.BOOLEAN)
    acidental: boolean;

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
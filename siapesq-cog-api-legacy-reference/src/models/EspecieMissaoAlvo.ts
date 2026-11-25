import { Table, Column, Model,  Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType, ForeignKey } from 'sequelize-typescript';
import Especies from './Especies';
import Missoes from './Missoes';
@Table({
    tableName:"EspecieMissaoAlvo",
    hooks:{
        afterUpdate:(especie_ms_alvo)=>{
            especie_ms_alvo.updatedAt = new Date()
        }
    }
})
export default class EspecieMissaoAlvo extends Model {
    
    @ForeignKey(()=>Especies)
    @AllowNull(false)
    @NotNull
    @Comment("Id da Especie")
    @Column(DataType.BIGINT) 
    id_especie:number;
    
    
    @ForeignKey(()=>Missoes)
    @AllowNull(false)
    @NotNull
    @Comment("Id da missao")
    @Column(DataType.BIGINT) 
    id_missao:number;


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
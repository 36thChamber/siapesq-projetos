import { Table, Column, Model, PrimaryKey,ForeignKey,BelongsTo, AutoIncrement, Unique, Default, NotNull, CreatedAt, UpdatedAt, DeletedAt, Comment, AllowNull, DataType } from 'sequelize-typescript';
import MarcaMotores from './Marca-Motores';
@Table({
    tableName:"Motores",
    hooks:{
        afterUpdate:(motor)=>{
            motor.updatedAt = new Date()
        }
    }
})
export default class Motores extends Model {
    @PrimaryKey 
    @AutoIncrement
    @Column(DataType.BIGINT) 
    id:number;
    
    @Unique
    @AllowNull(false)
    @NotNull
    @Comment("Nome do motor")
    @Column(DataType.STRING) 
    nome:string;
    
    @AllowNull(false)
    @NotNull
    @Comment("Potencia do Motor (medida em hp)")
    @Column(DataType.BIGINT) 
    potencia:number;

    @ForeignKey(()=>MarcaMotores)
    @Column(DataType.BIGINT) 
    id_marca:number;
    
    @BelongsTo(() => MarcaMotores)
    marca: MarcaMotores;


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
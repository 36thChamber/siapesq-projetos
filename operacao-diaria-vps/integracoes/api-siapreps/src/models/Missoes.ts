// src/models/Missoes.ts
import {
    AllowNull,
    AutoIncrement,
    BelongsTo,
    Column,
    Comment,
    CreatedAt,
    DataType,
    Default,
    DeletedAt,
    ForeignKey,
    HasMany,
    Model,
    NotNull,
    PrimaryKey,
    Table,
    Unique,
    UpdatedAt,
} from 'sequelize-typescript';

import { MissaoStatus } from '../models/enums/missao-status.enum';

import Usuarios from './Usuarios';
import Embarcacoes from './Embarcacoes';
import Portos from './Portos';
import ArtesDePesca from './ArtesDePesca';
import Especies from './Especies';
import Lances from './Lances';


@Table({
    schema: "siapreps",
    tableName: 'missoes',
    timestamps: true,
    paranoid: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
    deletedAt: 'deletado_em',
})
export default class Missoes extends Model {
    @Comment('Id da Missoes')
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id: number;

    @Comment('Id do Usuario (Herdado da tabela "Usuarios"), Obrigatório')
    @AllowNull(false)
    @NotNull
    @ForeignKey(() => Usuarios)
    @Column(DataType.BIGINT)
    id_usuario: number;

    @Comment('Id da Embarcação (Herdado da tabela "Embarcacoes"), Obrigatório')
    @AllowNull(false)
    @NotNull
    @ForeignKey(() => Embarcacoes)
    @Column(DataType.BIGINT)
    id_embarcacao: number;

    @Comment('Id do Porto de Saída ( Herdado da tabela "Portos"), Obrigatório')
    @AllowNull(false)
    @NotNull
    @ForeignKey(() => Portos)
    @Column(DataType.BIGINT)
    id_porto_saida: number;

    @Comment('Id do Porto de Chegada (Herdado da tabela "Portos"), Opcional')
    @AllowNull(true)
    @ForeignKey(() => Portos)
    @Column(DataType.BIGINT)
    id_porto_chegada: number | null;

    @Comment('Id do Artes de Pesca (Herdado da tabela "ArtesDePesca"), Obrigatório')
    @AllowNull(false)
    @NotNull
    @ForeignKey(() => ArtesDePesca)
    @Column(DataType.BIGINT)
    id_arte_pesca: number;

    @Comment('Id do Especie Alvo (Herdado da tabela "Especies"), Opcional')
    @AllowNull(true)
    @ForeignKey(() => Especies)
    @Column(DataType.BIGINT)
    id_especie_alvo: number | null;

    @Comment('Nome do Armador presente na Missão, Opcional')
    @AllowNull(true)
    @Column(DataType.STRING)
    nome_armador: string | null;

    @Comment('Data de inicio da Missão, Obrigatório')
    @AllowNull(false)
    @NotNull
    @Column(DataType.DATE)
    iniciou_em: Date;

    @Comment('Data de termino da Missão, Opcional')
    @AllowNull(true)
    @Column(DataType.DATE)
    terminou_em: Date | null;

    @Comment('Horário observado em campo ao iniciar a missão, quando fornecido pelo cliente')
    @AllowNull(true)
    @Column(DataType.DATE)
    iniciou_em_observado: Date | null;

    @Comment('Horário observado em campo ao finalizar a missão, quando fornecido pelo cliente')
    @AllowNull(true)
    @Column(DataType.DATE)
    terminou_em_observado: Date | null;

    
    // @AllowNull(true)
    // @Column(DataType.STRING)
    // status: string | null;
    @Comment('Define que estado a missão está, Obrigatório')
    @AllowNull(false)
    @Default(MissaoStatus.RASCUNHO)
    @Column({
    type: DataType.ENUM(...Object.values(MissaoStatus)),
    })
    status: MissaoStatus;

    @Comment('Identificador gerado pelo cliente para correlação em uso offline')
    @AllowNull(false)
    @Unique
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    client_record_id: string;

    @Comment('Versão do registro, usada para controle de concorrência otimista')
    @AllowNull(false)
    @Default(1)
    @Column(DataType.INTEGER)
    versao: number;

    @CreatedAt
    @Default(DataType.NOW)
    @Column(DataType.DATE)
    criado_em: Date;

    @UpdatedAt
    @Column(DataType.DATE)
    atualizado_em: Date;

    @DeletedAt
    @Column(DataType.DATE)
    deletado_em: Date | null;

    @BelongsTo(() => Usuarios, { foreignKey: 'id_usuario', as: 'usuario' })
    usuario: Usuarios;

    @BelongsTo(() => Embarcacoes, { foreignKey: 'id_embarcacao', as: 'embarcacao' })
    embarcacao: Embarcacoes;

    @BelongsTo(() => Portos, { foreignKey: 'id_porto_saida', as: 'portoSaida' })
    portoSaida: Portos;

    @BelongsTo(() => Portos, { foreignKey: 'id_porto_chegada', as: 'portoChegada' })
    portoChegada: Portos;

    @BelongsTo(() => ArtesDePesca, { foreignKey: 'id_arte_pesca', as: 'artePesca' })
    artePesca: ArtesDePesca;

    @BelongsTo(() => Especies, { foreignKey: 'id_especie_alvo', as: 'especieAlvo' })
    especieAlvo: Especies;

    @HasMany(() => Lances, { foreignKey: 'id_missao', as: 'lances' })
    lances: Lances[];
}

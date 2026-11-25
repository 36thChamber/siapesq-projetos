import Servidores from "../../models/phytoBloom/Servidores";

export type CriarServidorBody={
   id_usuario: number;
   nome: string;
   cpf: string;
   email: string;
}

export type CriarServidorResponse={
    id:number
    id_usuario: number;
    nome: string;
    cpf: string;
    email: string;
}

export type GetServidorParamsRequest = {
    id:number
}

export type GetServidorResponse={
    id:number
    id_usuario: number;
    nome: string;
    cpf: string;
    email: string;
    criado_em:Date;
    atualizado_em:Date;
    deletado_em:Date;
}
export type ListarServidoresQueryRequest = {
    limit:number
    offset:number
}
export type ListarServidoresResponse = {
    servidores:Servidores[],
    total:number
}

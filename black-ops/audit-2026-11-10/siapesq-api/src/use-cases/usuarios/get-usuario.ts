import Usuarios from '../../models/Usuarios';
import Embarcacoes from '../../models/Embarcacoes';
import { GetUsuarioResponse } from '../../types/usuarios-types';
export default class GetUsuarioUseCase{
    static async executa(id_usuario:number | string):Promise<GetUsuarioResponse>{
        try{
            const usuario=await Usuarios.findByPk(id_usuario)
            const embarcacoes= await Embarcacoes.findAll({
                where:{ id_mestre:id_usuario }
            })             

            if(!usuario){
                throw({
                    message:`Usuario(${id_usuario}) não encontrado`,
                    status:404
                })
            }
            return {
                id:usuario.id,
                nome:usuario.nome,
                insc_capt_portos:usuario.insc_capt_portos,
                documento:usuario.documento,
                email:usuario.email,
                administracao: usuario.administracao,
                telefone:usuario.telefone,
                ativo:usuario.ativo,
                criado_em:usuario.criado_em,
                atualizado_em:usuario.atualizado_em,
                deletado_em:usuario.deletado_em,
                embarcacoes:embarcacoes
              }
        }
        catch(err){
            throw(err)
        }
    }
}
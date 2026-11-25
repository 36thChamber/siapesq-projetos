import UsuariosAtivos from '../../models/UsuariosAtivos';
import { GetUsuarioAtivoResponse } from '../../types/usuariosAtivos-types';
export default class GetUsuarioAtivoUseCase{
    static async executa(id_usuario:number):Promise<GetUsuarioAtivoResponse>{
        try{
            const usuarios = await UsuariosAtivos.findOne({
                where: {
                    id_user: id_usuario
                }
            });
                                                                        
            if(!usuarios){
                throw({
                    message:`Nenhum usuário ativo encontrado.`,
                    status:404
                })
            }
            return {
                id:usuarios.id,
                id_user:usuarios.id_user,
                email:usuarios.email,
                telefone:usuarios.telefone,
                tipo_assinatura: usuarios.tipo_assinatura,
                ativo: usuarios.ativo,
                data_criacao:usuarios.data_criacao,
                data_fim:usuarios.data_fim
              }
        }
        catch(err){
            throw(err)
        }
    }
}

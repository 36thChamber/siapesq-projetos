import Alertas from '../../../models/phytoBloom/Alertas';
import Areas_Alertas from '../../../models/phytoBloom/Areas_Alertas';
import Reservatorios from '../../../models/phytoBloom/Reservatorios';
import Usuarios from '../../../models/phytoBloom/Usuarios';
import { GetUsuarioResponse } from '../../../types/phytobloom-types/usuarios-types';
export default class GetUsuarioUseCase{
    static async executa(id_usuario:number | string):Promise<GetUsuarioResponse>{
        try{
            const usuario=await Usuarios.findByPk(id_usuario)      
            const reservatorios= await Reservatorios.findAll({
                where:{ id_usuario: id_usuario }
            })             

            const reservatoriosComAreas = await Promise.all(
                reservatorios.map(async (reservatorio) => {
                  // Buscar as áreas de alerta para cada reservatório
                  const areasAlertas = await Areas_Alertas.findAll({
                    where: { id_reservatorio: reservatorio.id }
                  });
        
                  // Retorna o reservatório com suas associações
                  return {
                    ...reservatorio.toJSON(),
                    areas_alertas: areasAlertas
                  };
                })
              );

              
            if(!usuario){
                throw({
                    message:`Usuario(${id_usuario}) não encontrado`,
                    status:404
                })
            }
            return {
                id:usuario.id,
                nome:usuario.nome,
                documento:usuario.documento,
                email:usuario.email,
                telefone:usuario.telefone,
                ativo:usuario.ativo,
                user_verify: usuario.user_verify,
                criado_em:usuario.criado_em,
                atualizado_em:usuario.atualizado_em,
                deletado_em:usuario.deletado_em,
                reservatorios: reservatoriosComAreas
              }
        }
        catch(err){
            throw(err)
        }
    }
}
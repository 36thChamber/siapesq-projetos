import Usuarios from "../../models/phytoBloom/Usuarios";
import { enviandoEmail } from "../../services/verificarEmailPhyto-service"
import http_status from '../../consts/http-status-enum'
import AuthServices from '../../services/auth-services'
import UpdateUsuarioUseCase from "../../use-cases/phytonbloom_use-cases/usuarios/update-usuario";
import handlebars from 'handlebars';
import fs from 'fs';
import path from "path";

export default class VerificarEmailController{
    async enviarEmail(req: any, res: any){
        try {
            const { email } = req.body; 
            const usuario = await Usuarios.findOne({where:{email: email}})
            if(usuario){
              const jwt_secret=process.env.JWT_SECRET
                  if(!jwt_secret){
                      throw({
                          message:"JWT_SECRET não foi setada",
                          status:http_status.INTERNAL_ERROR
                      })
                  }
      
            const token=AuthServices.gera_jwt_token_email({id:usuario.id},jwt_secret)
            await enviandoEmail(usuario.nome, email, token );
            res.status(200).json({ message: 'E-mail de verificação enviado com sucesso!' });
            }else{
              res.status(500).json({ message: 'Erro ao enviar o e-mail de verificação.' });
            }
      
          } catch (error) {
            console.error('Erro ao enviar o e-mail de verificação:', error);
            res.status(500).json({ message: 'Erro ao enviar o e-mail de verificação.', error});
          }
    }

    async validarEmail(req:any, res:any){
        try{
            const token=req.params.token
              if(!token){
                  throw({
                      message:"token é indefinido",
                      status:http_status.UNAUTHORIZED
                  })
              }
      
              const segredo=process.env.JWT_SECRET
              if(!segredo){
                  throw({
                      message:"JWT_SECRET não definido",
                      status:http_status.INTERNAL_ERROR
                  })
              }
              const usuario = AuthServices.decoda_jwt_token(token,segredo)
              const { id } = usuario
              req.id_usuario = id;
      
              const ativar = UpdateUsuarioUseCase
              await ativar.executa({user_verify: true}, id)
              const template = path.join('src', 'templates', 'confirmaçãodoemail.html')
              const lendo_template = fs.readFileSync(template, 'utf-8')
              const template_aberto = handlebars.compile(lendo_template)
              const template_pronto = template_aberto({})
              return res.status(200).send(template_pronto)
              
          }catch(error){
            console.error('Erro ao verificar usuario:', error)
            return res.status(500).json({message: ' -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= Erro ao confirmar usuário!', error: error})
          }
    }
}
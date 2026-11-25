import Usuarios from '../models/Usuarios'
import http_status from '../consts/http-status-enum'
import AuthServices from '../services/auth-services'
import { alterarSenha } from '../services/esqueceuSenha-services'
import UpdateSenhaUsuarioUseCase from '../use-cases/usuarios/update-senha'
import handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

export default class EsqueceuSenhaControllers{
    async esqueceuSenha(req: any, res: any){
        try{
            const {email} = req.body
            const usuario = await Usuarios.findOne({where : {email: email} })
    
            if(usuario){
                const jwt_secret=process.env.JWT_SECRET
                if(!jwt_secret){
                    throw({
                        message:"JWT_SECRET não foi setada",
                        status:http_status.INTERNAL_ERROR
                    })
                }
    
                const token=AuthServices.gera_jwt_token_email({id:usuario.id},jwt_secret)        
                await alterarSenha(usuario.nome,email, token)
                res.status(200).json({ message: 'E-mail de verificação enviado com sucesso!' });
            }else{
                res.status(500).json({ message: 'Erro ao enviar o e-mail de verificação.' });
            }
        } catch(error){
            console.error('Erro ao enviar solicitação de alterar senha!', error)
        }
    }

    async trocarSenha(req:any, res: any){
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
            
            const template = path.join('src', 'templates', 'changepassword_template.html')
            const lendo_template = fs.readFileSync(template, 'utf-8')
            const template_aberto = handlebars.compile(lendo_template)
            const template_pronto = template_aberto({token: token})
            return res.status(200).send(template_pronto)
    
        } catch(error){
            console.error('Erro em alterar senha.', error)
        }
    }

    async salvarNovaSenha(req: any, res:any){
        try{
            const {newPassword, token} = req.body
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
    
            const dadosUser =  AuthServices.decoda_jwt_token(token,segredo)
    
            if(dadosUser){
                const novaSenha = UpdateSenhaUsuarioUseCase
                await novaSenha.executa({senha: newPassword}, dadosUser.id)
                const template = path.join('src', 'templates', 'passwordresetsucess_template.html')
                const lendo_template = fs.readFileSync(template, 'utf-8')
                const template_aberto = handlebars.compile(lendo_template)
                const template_pronto = template_aberto({})
                return res.status(200).send(template_pronto)
                
            } else{
                res.status(500).json({message: 'Usuário nao existe.'})
            }
    
            
        } catch(error){
            console.error('Erro em salvar nova senha', error)
        }
    }
}
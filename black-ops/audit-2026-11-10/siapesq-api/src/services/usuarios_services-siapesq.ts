import login_use_case from '../use-cases/siapesq_use-cases/login'
import criar_use_case from '../use-cases/siapesq_use-cases/Usuarios/post-Usuario'
import get_use_case from '../use-cases/siapesq_use-cases/Usuarios/get_id-Usuario'
import update_use_case from '../use-cases/siapesq_use-cases/Usuarios//update-Usuario'
import forgot_password_use_case from '../use-cases/siapesq_use-cases/Usuarios/forgot-password.use-case';
import reset_password_use_case from '../use-cases/siapesq_use-cases/Usuarios/reset-password.use-case';
import send_verification_email_use_case from '../use-cases/siapesq_use-cases/Usuarios/SendVerificationEmail';
import confirm_email_use_case from '../use-cases/siapesq_use-cases/Usuarios/ConfirmUserEmail';
import { UsuarioLoginRequestBody, CriarUsuarioBody,UpdateUsuarioBody } from '../types/siapesq_types/Usuarios-types';

export default class UsuariosService{
    static async login(body:UsuarioLoginRequestBody){
        try{
            await login_use_case.valida(body)
            return await login_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
    static async create(body:CriarUsuarioBody){
        try{
            await criar_use_case.valida(body)
            return await criar_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
    static async get(id_usuario:string | number){
        try{
            return await get_use_case.executa(id_usuario)
        }
        catch(err){
            throw(err)
        }
    }
    static async update(body:UpdateUsuarioBody,id_usuario:string){
        try{
            await update_use_case.valida(body)
            return await update_use_case.executa(body,id_usuario)
        }
        catch(err){
            throw(err)
        }
    }
    static async forgotPassword(body: { email: string }){
        try{
            await forgot_password_use_case.valida(body)
            
            return await forgot_password_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
    static async resetPassword(body: { token: string, novaSenha: string }){
        try{
            await reset_password_use_case.valida(body)
            return await reset_password_use_case.executa(body)
        }
        catch(err){
            throw(err)
        }
    }
    static async sendVerificationEmail(body: { id_usuario: number, email: string, nome: string }) {
        try {
            const sendEmailUseCase = new send_verification_email_use_case(); 
            return await sendEmailUseCase.execute(body.id_usuario, body.email, body.nome);
        }
        catch (err) {
            throw (err);
        }
    }
    static async verifyEmail(body: { token: string }) {
        try {
            await confirm_email_use_case.valida(body);
            return await confirm_email_use_case.executa(body.token);
        }
        catch (err) {
            throw (err);
        }
    }
    
}
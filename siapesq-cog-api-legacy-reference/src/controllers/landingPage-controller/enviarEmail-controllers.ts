import { enviandoEmail } from "../../services/enviarEmailLandingPage-service";

export default class VerificarEmailController{
    async enviarEmailContato(req: any, res: any){
        try {
            const { email,nome,sobrenome, mensagem,plataforma } = req.body; 
            
            await enviandoEmail(email,nome,sobrenome, mensagem,plataforma);
            return res.status(200).json({ message: 'E-mail enviado com sucesso.'});

          } catch (error) {
            console.error('Erro ao enviar o e-mail:', error);
            res.status(500).json({ message: 'Erro ao enviar o e-mail.', error});
          }
    }
}

import {Router} from 'express'
import EsqueceuSenhaControllers from '../../../controllers/phytobloom-controllers/esqueceuSenha-controller'

const router = Router()
const controllers = new EsqueceuSenhaControllers()

router.post('/', (req: any, res: any) =>  controllers.esqueceuSenha(req, res)) // rota que recebe email

router.get('/alterarSenha/:token', (req: any, res: any) => controllers.trocarSenha(req, res)) // rota que recebe nova senha

router.post('/salvarNovaSenha', (req:any, res: any) => controllers.salvarNovaSenha(req, res)) // rota que altera a senha

export default router
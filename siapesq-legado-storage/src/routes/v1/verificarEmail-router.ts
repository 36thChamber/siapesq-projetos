import { Router } from 'express'
import VerificarEmailController from '../../controllers/verificarEmail-controllers'

const router=Router()
const controller = new VerificarEmailController()

router.post('/enviar', (req:any, res:any) => controller.enviarEmail(req,res));
router.get('/:token', (req: any, res: any) => controller.validarEmail(req,res));

export default router
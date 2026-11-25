import { Router } from 'express'
import VerificarEmailControllers from '../../../controllers/phytobloom-controllers/verificarEmail-controllers'

const router=Router()

const controller=new VerificarEmailControllers()
router.post('/enviar', (req:any, res:any) => controller.enviarEmail(req,res));
router.get('/:token', (req: any, res: any) => controller.validarEmail(req,res));

export default router
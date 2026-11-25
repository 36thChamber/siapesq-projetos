import { Router } from 'express'
import VerificarEmailController from '../../../controllers/landingPage-controller/enviarEmail-controllers'

const router=Router()
const controller = new VerificarEmailController()

router.post('/', (req:any, res:any) => controller.enviarEmailContato(req,res));

export default router
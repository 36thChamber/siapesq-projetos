import { Router } from 'express'
import AdminController from '../../../controllers/siapesq_controllers/admin-controller'
import checa_token from '../../../middlewares/checa-token'
const router=Router()
const controller=new AdminController()

router.put("/aprovar-usuario", checa_token, (req:any, res) => controller.aprovar_usuario(req,res))
router.get("/buscar-usuario", checa_token, (req:any, res) => controller.buscar_usuario(req,res))
router.get("/buscar-especie", checa_token, (req: any,res) => controller.buscar_especie(req,res))
export default router
import { Router } from 'express'
import AdminController from '../controllers/admin-controller'
import asyncHandler from '../middlewares/async-handler'
import checa_token from '../middlewares/checa-token'
import checa_admin from '../middlewares/checa-admin'

const router=Router()
const controller=new AdminController()

router.use(checa_token, checa_admin)

router.put("/aprovar-usuario", asyncHandler((req:any, res) => controller.aprovar_usuario(req,res)))
router.get("/buscar-usuario", asyncHandler((req:any, res) => controller.buscar_usuario(req,res)))
router.get("/buscar-especie", asyncHandler((req: any,res) => controller.buscar_especie(req,res)))
export default router

import { Router } from 'express'
import checa_admin from '../middlewares/checa-admin'
import checa_token from '../middlewares/checa-token'
import checa_quota_especie from '../middlewares/checa-quota-especie'
import asyncHandler from '../middlewares/async-handler'
import EspeciesControllers from '../controllers/especies-controller'

const router=Router()
const controller=new EspeciesControllers()
router.get("/",checa_token,asyncHandler((req:any,res)=>controller.list(req,res)))
router.post("/",checa_token,checa_admin,asyncHandler((req:any,res)=>controller.create(req,res)))

router.get("/:id",checa_token,checa_quota_especie("id"),asyncHandler((req:any,res)=>controller.get(req,res)))
router.get("/:usageKey/imagens",checa_token,asyncHandler((req:any,res)=>controller.images(req,res)))

export default router

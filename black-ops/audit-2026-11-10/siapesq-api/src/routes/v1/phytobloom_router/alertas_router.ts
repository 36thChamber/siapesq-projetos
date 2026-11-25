import { Router } from 'express'
import checa_token from '../../../middlewares/checa-token'
import checa_api_key from '../../../middlewares/checa-api-key'
import AlertasController from '../../../controllers/phytobloom-controllers/alertas'
const router=Router()
const controller=new AlertasController()
router.post("/",checa_token,(req:any,res)=>controller.create(req,res))
router.post("/bulk",checa_api_key,(req:any,res)=>controller.createBulk(req,res))
router.get("/",(req:any,res)=>controller.list(req,res))
router.get("/:id",(req:any,res:any)=>controller.get(req,res))
//ROTA PARA APAGAR ALERTA
//router.delete("/:id",checa_token,(req:any,res:any)=>controller.update(req,res))
export default router
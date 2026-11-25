import { Router } from 'express'
import ReservatorioController from '../../../controllers/phytobloom-controllers/reservatorios-controller'
import checa_token from '../../../middlewares/checa-token'
import checa_api_key from '../../../middlewares/checa-api-key'
const router=Router()
const controller=new ReservatorioController()
router.post("/",checa_token,(req:any,res)=>controller.create(req,res))
router.get("/",checa_api_key,(req:any,res)=>controller.list(req,res))
router.get("/:id",checa_api_key,(req:any,res:any)=>controller.get(req,res))
router.put("/:id",checa_token,(req:any,res:any)=>controller.update(req,res))
router.delete('/:id', checa_token, (req:any,res:any)=> controller.delete(req,res))
export default router
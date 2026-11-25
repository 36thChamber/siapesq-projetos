import { Router } from 'express'
import checa_token from '../../../middlewares/checa-token'
import ServidoresController from '../../../controllers/phytobloom-controllers/servidores'

const router=Router()
const controller=new ServidoresController()
router.post("/", (req:any, res) => controller.create(req,res))
router.get("/:id", (req:any,res)=>controller.get(req,res))
router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
export default router

import { Router } from 'express'
import UsuariosAtivosController from '../../controllers/usuariosAtivos-controller'
import checa_token from '../../middlewares/checa-token'

const router=Router()
const controller=new UsuariosAtivosController()

router.post("/",checa_token, (req: any, res) =>  controller.create(req,res))
router.get("/:id", checa_token, (req:any,res)=>controller.getId(req,res))
router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.put("/",checa_token,(req:any,res)=>controller.update(req,res))
router.delete("/",checa_token,(req:any,res)=>controller.delete(req,res))
export default router
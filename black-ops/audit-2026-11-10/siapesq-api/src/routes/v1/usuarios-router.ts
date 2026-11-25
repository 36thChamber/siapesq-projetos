import { Router } from 'express'
import UsuariosController from '../../controllers/usuarios-controller'
import checa_token from '../../middlewares/checa-token'
const router=Router()
const controller=new UsuariosController()
router.post("/login",controller.login)
router.post("/",controller.create)
router.get("/refresh-token", checa_token, (req: any, res) => controller.novoToken(req, res))
router.get("/:id", (req:any,res)=>controller.getId(req,res))
router.get("/",checa_token,(req:any,res)=>controller.get(req,res))
router.put("/",checa_token,(req:any,res)=>controller.update(req,res))
export default router
router.post("/login",controller.login)

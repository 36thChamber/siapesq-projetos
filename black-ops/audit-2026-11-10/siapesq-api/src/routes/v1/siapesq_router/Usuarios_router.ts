import { Router } from 'express'
import UsuariosController from '../../../controllers/siapesq_controllers/usuarios-controller'
import checa_token from '../../../middlewares/checa-token'

const router=Router()
const controller=new UsuariosController()

// ROTAS FIXAS E ESPECÍFICAS (sem parâmetros)
router.post("/forgot-password", controller.forgotPassword.bind(controller))
router.get("/reset-password-form", controller.renderResetPasswordForm.bind(controller))
router.post("/reset-password", controller.resetPassword.bind(controller))
router.get("/verify-email", controller.verifyEmail.bind(controller))
router.post("/send-verification-email", controller.sendVerificationEmail.bind(controller))
router.post("/login",(req,res) => controller.login(req,res))
router.post("/", (req,res) => controller.create(req,res))

// ROTAS COM MIDDLEWARE OU QUE FAZEM OPERAÇÕES GERAIS
router.get("/refresh-token", checa_token, (req: any, res) => controller.novoToken(req, res))
router.get("/",checa_token,(req:any,res)=>controller.list(req,res))
router.put("/",checa_token,(req:any,res)=>controller.update(req,res))

// ROTAS COM PARÂMETROS (/:id DEVE VIR POR ÚLTIMO)
router.get("/:id", (req:any,res)=>controller.getId(req,res))

export default router
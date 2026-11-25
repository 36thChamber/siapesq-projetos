import { Router } from 'express'
import UsuariosController from '../controllers/usuarios-controller'
import asyncHandler from '../middlewares/async-handler'
import checa_admin from '../middlewares/checa-admin'
import checa_token from '../middlewares/checa-token'
import ScientificCertificates from '../services/scientific-certificates'
import { atorDaRequisicao } from '../utils/autorizacao-recurso'
import {
  rateLimitLogin,
  rateLimitSenha,
  rateLimitCadastro,
  rateLimitEnvioEmail,
} from "../middlewares/rate-limit";

const router=Router()
const controller=new UsuariosController()

// ROTAS FIXAS E ESPECÍFICAS (sem parâmetros)
router.post("/forgot-password", ...rateLimitSenha, asyncHandler(controller.forgotPassword.bind(controller)))
router.post("/reset-password", ...rateLimitSenha, asyncHandler(controller.resetPassword.bind(controller)))
router.get("/verify-email", asyncHandler(controller.verifyEmail.bind(controller)))
router.post("/verify-email", ...rateLimitEnvioEmail, asyncHandler(controller.verifyEmail.bind(controller)))

// Fluxo público (pré-login): recebe apenas e-mail e responde genérico.
router.post("/send-verification-email", ...rateLimitEnvioEmail, asyncHandler(controller.sendVerificationEmail.bind(controller)))

router.post("/login", ...rateLimitLogin, asyncHandler((req, res) => controller.login(req, res)))
router.post("/", rateLimitCadastro, asyncHandler((req, res) => controller.create(req, res)))

// ROTAS COM MIDDLEWARE OU QUE FAZEM OPERAÇÕES GERAIS
router.get("/refresh-token", checa_token, asyncHandler((req: any, res) => controller.novoToken(req, res)))
router.get("/",checa_token,checa_admin,asyncHandler((req:any,res)=>controller.list(req,res)))
router.put("/",checa_token,asyncHandler((req:any,res)=>controller.update(req,res)))

// ROTAS COM PARÂMETROS (/:id DEVE VIR POR ÚLTIMO)
router.get('/:id/comprovante',checa_token,asyncHandler(async(req:any,res)=>{
  res.set('Cache-Control','private, no-store').json(await ScientificCertificates.get(req.params.id,atorDaRequisicao(req)));
}))
router.get('/:id/comprovante/download',checa_token,asyncHandler(async(req:any,res)=>{
  const file=await ScientificCertificates.get(req.params.id,atorDaRequisicao(req),true);
  res.set({'Cache-Control':'private, no-store','Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="comprovante${file.tipo==='application/pdf'?'.pdf':file.tipo==='image/png'?'.png':'.jpg'}"; filename*=UTF-8''${encodeURIComponent(file.nome).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}).send(file.conteudo);
}))
router.put('/:id/comprovante',checa_token,asyncHandler(async(req:any,res)=>{
  res.set('Cache-Control','private, no-store').json(await ScientificCertificates.replace(req.params.id,req.body,atorDaRequisicao(req)));
}))
router.get("/:id", checa_token, asyncHandler((req:any,res)=>controller.getId(req,res)))

export default router

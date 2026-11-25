import { Router } from 'express'
import usuarios_router from './usuarios-router'
import embarcacao_router from './embacacao-router'
import portos_router from './portos-router'
import iscas_router from './iscas-router'
import fundos_router from './fundos-router'
import armadilhas_router from './armadilhas-router'
import marca_motores_router from './marca-motores-router'
import motores_router from './motores-router'
import especies from './especies-router'
import lances_router from './lances-router'
import missoes_router from './missoes-router'
import relatorios_router from './relatorios-router'
import artesDePesca_router from './artesDePesca_router'
import peixeRFID_router from './peixeRFID-router'
import mapas_router from './mapas_router'
import usuariosAtivos_router from './usuariosAtivos-router'
import verificarEmail_router from './verificarEmail-router'
import esqueceuSenha_router from './esqueceuSenha-router'
import enviarEmail_router from './landingPage_router/enviarEmail-router'
import especies_analises_router from './especies_analises-router'

const router=Router()
router.use("/usuarios",usuarios_router)
router.use("/usuariosAtivos",usuariosAtivos_router)
router.use("/embarcacoes", embarcacao_router)
router.use("/portos",portos_router)
router.use("/armadilhas",armadilhas_router)
router.use("/fundos",fundos_router)
router.use("/iscas",iscas_router)
router.use("/marca-motores",marca_motores_router)
router.use("/especies",especies)
router.use("/motores",motores_router)
router.use("/lances",lances_router)
router.use("/missoes",missoes_router)
router.use("/relatorios",relatorios_router)
router.use("/artesDePesca", artesDePesca_router)
router.use("/peixeRFID",peixeRFID_router)
router.use("/mapas",mapas_router)
router.use("/verificarEmail", verificarEmail_router)
router.use("/especies_analises", especies_analises_router)

router.use('/enviarEmail', enviarEmail_router)

router.use('/esqueceuSenha', esqueceuSenha_router)
export default router
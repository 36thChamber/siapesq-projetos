import { Router } from "express";
import usuarios from "./usuarios-routes";
import especies from "./especies-routes";
import grupoEspecies from "./grupo-especies-routes";
import informacoesEspecies from "./informacoes-especies-routes";
import admin from "./admin-routes";
import analises from "./analises-routes";
import analisesBucket from "./analises-bucket-routes";
import artigos from "./artigos-routes";
import planos from "./planos-routes";
import assinaturas from "./assinaturas-routes";
import pagamentos from "./pagamentos-routes";
import checkout from "./checkout-routes"
import webHooks from "./web-hooks-routes"
import contato from "./contato-routes";

const router = Router();
router.use("/usuarios", usuarios);
router.use("/especies", especies);
router.use("/gruposEspecies", grupoEspecies);
router.use("/informacoes-especies", informacoesEspecies);
router.use('/admin', admin)
router.use('/analises', analises)
router.use("/analisesBucket", analisesBucket);
router.use("/artigos", artigos);
router.use("/planos", planos);
router.use("/assinaturas", assinaturas);
router.use("/pagamentos", pagamentos);
router.use("/checkout", checkout);
router.use("/webHooks", webHooks);
router.use("/contato", contato);

export default router;

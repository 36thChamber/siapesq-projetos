import { Router } from "express";
import modeloUsuario from "./Usuarios_router";
import especies from "./Especies_router";
import grupoEspecies from "./GrupoEspecies_router";
import informacoesEspecies from "./InformaçoesEspecies_router";
import mapasRouter from "./GBIF_maps_router";
import especiesGBIF from "./Especies_GBIF_router";
import admin from "./Admin_router";
import artigos from "./artigos-routes";
import analises from "./Analises-router"
import analisesBucket from "./Analises_Bucket-router"

const router = Router();
router.use("/usuarios", modeloUsuario);
router.use("/especies", especies);
router.use("/gruposEspecies", grupoEspecies);
router.use("/informacoesEspecies", informacoesEspecies);
router.use("/mapas", mapasRouter);
router.use("/especiesGBIF", especiesGBIF);
router.use('/admin', admin)
router.use('/analises', analises)
router.use("/analisesBucket", analisesBucket);
router.use("/artigos", artigos);

export default router;

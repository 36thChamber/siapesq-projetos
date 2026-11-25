import { Router } from "express";
import asyncHandler from "../middlewares/async-handler";
import ContatosController from "../controllers/contatos-controller";

const router = Router();
const controller = new ContatosController();

router.post("/", asyncHandler((req, res) => controller.create(req, res)));

export default router;

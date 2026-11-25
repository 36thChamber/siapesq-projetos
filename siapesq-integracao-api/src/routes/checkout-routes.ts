import { Router } from "express";
import asyncHandler from "../middlewares/async-handler";
import checa_token from "../middlewares/checa-token";
import CheckoutController from "../controllers/checkout-controller";

const router = Router();
const controller = new CheckoutController();

router.post("/", checa_token, asyncHandler((req: any, res) => controller.create(req, res)));

export default router;

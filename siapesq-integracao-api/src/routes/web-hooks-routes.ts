import { Router } from "express";
import express from "express";
import asyncHandler from "../middlewares/async-handler";
import WebhooksController from "../controllers/webHooks-controller";

const router = Router();
const controller = new WebhooksController();

router.post(
    "/stripe",
    express.raw({ type: "application/json" }),
    asyncHandler((req: any, res) => controller.stripe(req, res))
);

router.post(
    "/mercadopago",
    express.json(),
    asyncHandler((req: any, res) => controller.mercadopago(req, res))
);

export default router;

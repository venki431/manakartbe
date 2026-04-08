import express from "express";
import {createOrder, getMyOrders, getAllOrders} from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", authenticate, getMyOrders);
router.post("/create", authenticate, createOrder);
router.get("/all", authenticate, getAllOrders);

export default router;
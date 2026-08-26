import express from "express";
import { createOrder, getMyOrders, getAllOrders, getOrderById, updateOrderStatus } from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";

const router = express.Router();

// Customer routes
router.get("/", authenticate, getMyOrders);
router.post("/create", authenticate, createOrder);

// Admin routes
router.get("/all", authenticate, requireAdmin, getAllOrders);
router.get("/:id", authenticate, requireAdmin, getOrderById);
router.patch("/:id/status", authenticate, requireAdmin, updateOrderStatus);

export default router;

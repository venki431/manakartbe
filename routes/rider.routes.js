import express from "express";

import {
  getRiderOrders,
  acceptRiderOrder,
  updateRiderOrderStatus,
  getRiderHistory
} from "../controllers/rider.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRider } from "../middlewares/rider.middleware.js";

const router = express.Router();

router.get("/orders", authenticate, requireRider, getRiderOrders);

router.patch("/orders/:id/accept", authenticate, requireRider, acceptRiderOrder);

router.patch("/orders/:id/status", authenticate, requireRider, updateRiderOrderStatus);

router.get(
  "/history",
  authenticate,
  requireRider,
  getRiderHistory
);

export default router;

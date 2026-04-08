import express from "express";
import {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead,
  getMyNotifications, getMyUnreadCount, markMyAsRead, markAllMyAsRead
} from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";

const router = express.Router();

// Customer routes (must be before admin routes to avoid conflict with /:id)
router.get("/my", authenticate, getMyNotifications);
router.get("/my/unread-count", authenticate, getMyUnreadCount);
router.patch("/my/read-all", authenticate, markAllMyAsRead);
router.patch("/my/:id/read", authenticate, markMyAsRead);

// Admin routes
router.get("/", authenticate, requireAdmin, getNotifications);
router.get("/unread-count", authenticate, requireAdmin, getUnreadCount);
router.patch("/read-all", authenticate, requireAdmin, markAllAsRead);
router.patch("/:id/read", authenticate, requireAdmin, markAsRead);

export default router;

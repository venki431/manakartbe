import express from "express";
import { getAllUsers, getMyProfile, getMyAddresses, createAddress, updateAddress, deleteAddress } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";

const router = express.Router();

// Admin: list all users (declared before "/" and "/addresses" to keep paths clear)
router.get("/all", authenticate, requireAdmin, getAllUsers);

router.get("/", authenticate, getMyProfile);
router.get("/addresses", authenticate, getMyAddresses);
router.post("/addresses", authenticate, createAddress);
router.put("/addresses/:id", authenticate, updateAddress);
router.delete("/addresses/:id", authenticate, deleteAddress);

export default router;
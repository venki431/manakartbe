import express from "express";
import { getMyProfile, getMyAddresses, createAddress, updateAddress, deleteAddress } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();


router.get("/", authenticate, getMyProfile);
router.get("/addresses", authenticate, getMyAddresses);
router.post("/addresses", authenticate, createAddress);
router.put("/addresses/:id", authenticate, updateAddress);
router.delete("/addresses/:id", authenticate, deleteAddress);

export default router;
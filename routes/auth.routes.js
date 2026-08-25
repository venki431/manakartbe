import express from "express";
import {signUp, login, resetPassword, forgotPassword, verifyResetOtp} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/reset-password", resetPassword); 
router.post("/forgot-password", forgotPassword); // Add this line for forgot password route
router.post("/verify-reset-otp", verifyResetOtp); // Add this line for OTP verification route



export default router;
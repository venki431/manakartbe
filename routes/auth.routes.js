import express from "express";
import {signUp, login, resetPassword} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/reset-password", resetPassword); 

export default router;
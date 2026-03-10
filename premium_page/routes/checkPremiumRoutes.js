import express from "express";
import { checkPremium } from "../controllers/checkPremiumController.js";

const router = express.Router();

router.get("/check-premium", checkPremium);

export default router;

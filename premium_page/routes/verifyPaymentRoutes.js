import express from "express";
import { verifyPayment } from "../controllers/verifyPaymentController.js";

const router = express.Router();

router.post("/verify-payment", verifyPayment);

export default router;

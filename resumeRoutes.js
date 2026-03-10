import express from "express";
import { analyzeResume } from "../controllers/resumeController.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/analyze-resume", upload.single("resume"), analyzeResume);

export default router;
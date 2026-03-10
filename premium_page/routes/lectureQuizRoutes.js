import express from "express";
import { generateLectureQuiz } from "../controllers/lectureQuizController.js";

const router = express.Router();

router.post("/generate-lecture-quiz", generateLectureQuiz);

export default router;

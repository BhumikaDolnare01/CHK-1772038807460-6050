import express from "express";
import { hrChat } from "../controllers/hrChatController.js";

const router = express.Router();

router.post("/hr-chat", hrChat);

export default router;

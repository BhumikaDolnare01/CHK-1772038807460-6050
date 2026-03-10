import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import quizRoutes from "./routes/quizRoutes.js";
import lectureQuizRoutes from "./routes/lectureQuizRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import verifyPaymentRoutes from "./routes/verifyPaymentRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import hrChatRoutes from "./routes/hrChatRoutes.js";
import checkPremiumRoutes from "./routes/checkPremiumRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());                // ← line 18, BEFORE everything
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", quizRoutes);
app.use("/api", lectureQuizRoutes);
app.use("/api", paymentRoutes);
app.use("/api", verifyPaymentRoutes);
app.use("/api", resumeRoutes);
app.use("/api", hrChatRoutes);
app.use("/api", checkPremiumRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", environment: process.env.NODE_ENV });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;

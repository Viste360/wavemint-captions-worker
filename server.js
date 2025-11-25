import express from "express";
import cors from "cors";
import generateRoute from "./routes/generate.js";

const app = express();

// Safety middlewares
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Health check for Railway logs
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "captions-worker" });
});

// Caption generation
app.use("/generate", generateRoute);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "not_found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🚨 Unhandled error in captions-worker:", err);
  res.status(500).json({ error: "internal_error" });
});

// Start service
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log("🎤 Captions worker running on port", PORT);
});


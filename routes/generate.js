import express from "express";
import multer from "multer";
import { transcribeAudio } from "../utils/whisper.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/generate", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded." });
    }

    const transcription = await transcribeAudio(req.file.path);

    res.json({
      status: "success",
      text: transcription.text,
      segments: transcription.segments || []
    });
  } catch (err) {
    console.error("❌ Caption worker error:", err);
    res.status(500).json({ error: "Failed to process audio." });
  }
});

export default router;

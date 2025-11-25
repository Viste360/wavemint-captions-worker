import express from "express";
import multer from "multer";
import fs from "fs";
import {
  extractAudio,
  whisperTranscribe,
  refineCaptions
} from "../utils/whisper.js";

const router = express.Router();

// Upload handler: store in /tmp (Railway-safe)
const upload = multer({
  dest: "/tmp",
  limits: { fileSize: 1024 * 1024 * 500 }, // 500MB max
});

router.post(
  "/",
  upload.fields([{ name: "video", maxCount: 1 }]),
  async (req, res) => {
    let videoFile;

    try {
      videoFile = req.files?.video?.[0];

      if (!videoFile) {
        return res.status(400).json({ error: "video_file_required" });
      }

      console.log("🎥 Received video:", videoFile.path);

      // STEP 1 — Extract audio
      const audioPath = await extractAudio(videoFile.path);
      console.log("🎵 Extracted WAV:", audioPath);

      // STEP 2 — Whisper transcription
      const whisperResult = await whisperTranscribe(audioPath);
      console.log("📝 Whisper transcription received.");

      const rawSegments = whisperResult.segments || [];

      // STEP 3 — Refine with GPT
      const refined = await refineCaptions(rawSegments);
      console.log("✨ GPT refined captions generated.");

      // STEP 4 — Cleanup
      cleanupFile(videoFile.path);
      cleanupFile(audioPath);

      return res.json({
        status: "success",
        segments: refined.segments || refined,
      });
    } catch (err) {
      console.error("Captions /generate error:", err);

      // Cleanup on failure
      try {
        if (videoFile?.path && fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }
      } catch {}

      return res.status(500).json({ error: "caption_generation_failed" });
    }
  }
);

function cleanupFile(file) {
  try {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  } catch (err) {
    console.warn("Cleanup failed:", err);
  }
}

export default router;

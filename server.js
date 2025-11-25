import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// File upload folder
const upload = multer({ dest: "uploads/" });

// OpenAI Whisper
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility: Convert segments → SRT format
function toSRT(segments) {
  return segments
    .map((seg, i) => {
      const start = new Date(seg.start * 1000).toISOString().substr(11, 12);
      const end = new Date(seg.end * 1000).toISOString().substr(11, 12);

      return `${i + 1}
${start.replace(".", ",")} --> ${end.replace(".", ",")}
${seg.text.trim()}

`;
    })
    .join("");
}

// Utility: Convert segments → VTT format
function toVTT(segments) {
  return (
    "WEBVTT\n\n" +
    segments
      .map((seg) => {
        const start = new Date(seg.start * 1000).toISOString().substr(11, 12);
        const end = new Date(seg.end * 1000).toISOString().substr(11, 12);

        return `${start} --> ${end}
${seg.text.trim()}

`;
      })
      .join("")
  );
}

// HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ status: "Captions Worker OK", uptime: process.uptime() });
});

// MAIN ENDPOINT — Generate transcript + subtitles
app.post("/api/captions", upload.single("file"), async (req, res) => {
  try {
    const filepath = req.file.path;

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filepath),
      model: "gpt-4o-transcribe",
      response_format: "verbose_json",
    });

    fs.unlinkSync(filepath); // delete temp upload

    const srt = toSRT(transcription.segments);
    const vtt = toVTT(transcription.segments);

    res.json({
      success: true,
      text: transcription.text,
      segments: transcription.segments,
      srt,
      vtt,
    });
  } catch (err) {
    console.error("CAPTION ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Whisper transcription failed.",
    });
  }
});

// PORT CONFIG FOR RAILWAY
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🎧 Captions Worker running on ${PORT}`));

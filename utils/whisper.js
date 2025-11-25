import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function transcribeAudio(filePath) {
  try {
    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "gpt-4o-transcribe", 
      response_format: "verbose_json"
    });

    return response;
  } catch (error) {
    console.error("❌ Whisper transcription error:", error);
    throw new Error("Whisper failed: " + error.message);
  }
}

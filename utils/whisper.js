import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import OpenAI from "openai";

ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract audio from video into /tmp/output.wav
 */
export async function extractAudio(videoPath) {
  const outPath = `/tmp/audio_${Date.now()}.wav`;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioChannels(1)
      .audioFrequency(16000)
      .output(outPath)
      .on("end", () => resolve(outPath))
      .on("error", reject)
      .run();
  });
}

/**
 * Transcribe audio using Whisper
 */
export async function whisperTranscribe(audioPath) {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
  });

  return response; // contains segments with start/end/time
}

/**
 * Clean & structure captions with GPT
 */
export async function refineCaptions(rawSegments) {
  const text = rawSegments.map(s => s.text).join(" ");

  const prompt = `
You are a professional subtitle editor.
Given this raw transcript:

"${text}"

1. Clean grammar and readability.
2. Keep meaning.
3. Return ONLY clean subtitles split into segments that are 1–8 words each.
4. Return JSON array of: { "text": "...", "start": x.x, "end": x.x }
5. Keep original timings by following raw segments order.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a subtitle processor." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  return response.choices[0].message.parsed;
}

import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Initialize the Gemini API client
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });

  console.log('Generating TTS with Gemini API...');
  
  // Generate audio using Gemini TTS
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: 'Say cheerfully: Have a wonderful day!' }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  // Extract the audio data (base64 encoded)
  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!data) {
    console.error('Failed to generate audio: No data received');
    return;
  }
  
  // Convert base64 to buffer (the data is already in WAV format)
  const audioBuffer = Buffer.from(data, 'base64');
  
  // Save directly to file (no need for WAV writer, as it's already WAV formatted)
  const fileName = 'output.wav';
  await fs.writeFile(fileName, audioBuffer);
  
  console.log(`Audio saved to ${fileName} (${audioBuffer.length} bytes)`);
  console.log('Play it with your default audio player to verify it works');
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 
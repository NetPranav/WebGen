const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function test() {
  console.log("Initializing AI with key:", process.env.TALK_API_KEY_5?.substring(0, 10) + "...");
  const ai = new GoogleGenAI({ apiKey: process.env.TALK_API_KEY_5 });
  
  console.log("Calling generateContent...");
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello world"
    });
    console.log("Response:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();

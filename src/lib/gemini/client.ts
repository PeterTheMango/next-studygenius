import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  // Warn but don't crash during build
  if (process.env.NODE_ENV !== "production") {
    console.warn("GEMINI_API_KEY is not set");
  }
}

export const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy",
});

export const GEMINI_MODEL = "gemini-2.5-flash";

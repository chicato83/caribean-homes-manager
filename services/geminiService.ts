import { GoogleGenAI } from "@google/genai";
import { Apartment } from "../types";

// Note: In a real production app, ensure this is handled via a proxy or server-side
// to protect the key. For this client-side demo, we use env var or fail gracefully.
const apiKey = process.env.API_KEY || ''; 

export const GeminiService = {
  isEnabled: () => !!apiKey,

  generateDescription: async (aptName: string, amenities: string[]): Promise<string> => {
    if (!apiKey) {
      return "Error: API Key missing. Cannot generate description.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Write a catchy, inviting description for a short-term rental apartment named "${aptName}". 
      It has the following amenities: ${amenities.join(', ')}. 
      Target audience: Tourists and business travelers. Keep it under 100 words.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "Could not generate description.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Error connecting to AI service.";
    }
  },

  suggestMaintenance: async (equipmentName: string): Promise<{ frequencyDays: number; notes: string }> => {
    if (!apiKey) {
      return { frequencyDays: 90, notes: "Default schedule (API Key missing)" };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Suggest a maintenance schedule for: "${equipmentName}" in a rental apartment context. 
      Return ONLY a JSON object with two fields: "frequencyDays" (integer, days between service) and "notes" (string, short technical advice).
      Example: {"frequencyDays": 180, "notes": "Check filters and drainage."}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const text = response.text;
      if (text) {
        return JSON.parse(text);
      }
      throw new Error("Empty response");
    } catch (error) {
        console.error("Gemini API Error:", error);
        return { frequencyDays: 90, notes: "Manual check recommended." };
    }
  }
};

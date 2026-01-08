
import { GoogleGenAI, Type } from "@google/genai";

// Generate quizzes using Gemini 3 Pro for complex reasoning tasks.
export const generateAIQuiz = async (topic: string, count: number, schoolLevel: string) => {
  // Always initialize with API key from environment variables.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Topic: ${topic}. Level: ${schoolLevel}. Generate ${count} multiple choice quizzes.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answer: { type: Type.INTEGER, description: "Index of correct option 0-3" },
            reward: { type: Type.NUMBER }
          },
          required: ["question", "options", "answer", "reward"]
        }
      }
    }
  });
  
  // Directly access the text property as per documentation.
  const text = response.text;
  if (!text) return [];
  return JSON.parse(text.trim());
};

// Summarize news using Gemini 3 Flash for basic text processing.
export const summarizeNews = async (content: string, schoolLevel: string) => {
  // Always initialize with API key from environment variables.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize the following news article for a ${schoolLevel} student level: ${content}`,
  });
  // Directly access the text property.
  return response.text || "";
};


import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateAIQuiz = async (topic: string, count: number, schoolLevel: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  
  return JSON.parse(response.text);
};

export const summarizeNews = async (content: string, schoolLevel: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize the following news article for a ${schoolLevel} student level: ${content}`,
  });
  return response.text;
};

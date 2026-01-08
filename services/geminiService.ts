
import { GoogleGenAI, Type } from "@google/genai";

// API Key를 안전하게 가져오는 헬퍼 (process.env.API_KEY 규칙을 준수하면서 에러 방지)
const getSafeApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

export const generateAIQuiz = async (topic: string, count: number, schoolLevel: string) => {
  const apiKey = getSafeApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
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
  
  const text = response.text;
  if (!text) return [];
  return JSON.parse(text.trim());
};

export const summarizeNews = async (content: string, schoolLevel: string) => {
  const apiKey = getSafeApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize the following news article for a ${schoolLevel} student level: ${content}`,
  });
  return response.text || "";
};

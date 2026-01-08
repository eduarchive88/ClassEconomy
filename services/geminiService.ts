
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  // localStorage에서 선생님이 설정한 키를 먼저 찾고, 없으면 환경변수를 사용합니다.
  const userApiKey = localStorage.getItem('user_gemini_api_key');
  return userApiKey || process.env.API_KEY || '';
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini API Key가 설정되지 않았습니다. 설정 탭에서 키를 입력해주세요.");
  }
  return new GoogleGenAI({ apiKey });
};

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

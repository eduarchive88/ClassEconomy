
import { GoogleGenAI, Type } from "@google/genai";

export const generateAIQuiz = async (topic: string, count: number, schoolLevel: string) => {
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
  const text = response.text;
  if (!text) return [];
  return JSON.parse(text.trim());
};

export const summarizeNews = async (content: string, schoolLevel: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `다음 경제 뉴스 기사를 ${schoolLevel} 수준에 맞춰서 쉽고 명확하게 요약해줘: ${content}. 학생이 경제 개념을 이해하기 좋게 설명해줘.`,
  });
  return response.text || "";
};

export const getMarketData = async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stocks = "삼성전자, 삼성SDI, 포스코홀딩스, 대한항공, LG전자, 현대자동차, 기아, NAVER, 카카오, LG화학, 셀트리온, Apple, Amazon, Netflix, Tesla, NVIDIA, Microsoft, Meta";
  const coins = "비트코인(BTC), 이더리움(ETH), 리플(XRP)";
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `지금 즉시 구글 금융(Google Finance)에 접속하여 다음 종목들의 가장 최신 현재가와 오늘 전일대비 등락률(%)을 확인해서 JSON으로 출력해줘.
    주식: ${stocks}
    코인: ${coins}
    정확한 가격 데이터를 가져와야 해. 응답 형식: { "stocks": [{ "name": string, "price": string, "change": string }], "coins": [...] }`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                price: { type: Type.STRING },
                change: { type: Type.STRING }
              }
            }
          },
          coins: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                price: { type: Type.STRING },
                change: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "{\"stocks\": [], \"coins\": []}");
  } catch (e) {
    return { stocks: [], coins: [] };
  }
};

export const getEconomyNews = async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: "지금 구글 뉴스(news.google.com)의 경제/금융 섹션에서 가장 중요한 뉴스 5개를 실시간으로 검색해서 알려줘. JSON 배열 형식: [{ 'title': string, 'url': string }]",
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING }
          }
        }
      }
    }
  });
  
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};

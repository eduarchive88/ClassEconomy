
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
    contents: `구글 금융(Google Finance)의 최신 정보를 바탕으로 다음 종목들의 현재가(KRW 또는 USD)와 등락률을 JSON 형식으로 알려줘.
    주식: ${stocks}
    코인: ${coins}
    응답은 반드시 { "stocks": [{ "name": string, "price": string, "change": string }], "coins": [...] } 형식을 지켜줘.`,
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

  return JSON.parse(response.text || "{}");
};

export const getEconomyNews = async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: "구글 뉴스에서 가장 최신의 주요 경제 및 금융 뉴스 5개를 알려줘. 뉴스 제목과 원문 링크(URL)가 포함된 JSON 배열로 응답해줘. [{ 'title': string, 'url': string }]",
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
  
  return JSON.parse(response.text || "[]");
};

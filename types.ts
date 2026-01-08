
export type UserRole = 'teacher' | 'student';
export type SchoolLevel = 'elementary' | 'middle' | 'high';

export interface Student {
  id: string; // 학번
  name: string;
  grade: string;
  class: string;
  number: string;
  password?: string;
  salary: number; // 주급
  balance: number; // 현금 (입출금통장)
  bankBalance: number; // 은행 저축 (이자 발생)
  brokerageBalance: number; // 증권 예수금 (투자용)
  teacherId: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: [string, string, string, string];
  answer: number; // 1-4 (엑셀 정답 기준)
  reward: number;
}

export interface StockInfo {
  code: string;
  name: string;
  price: number;
  change: number;
  type: 'stock' | 'crypto';
}

export interface MarketItem {
  id: string;
  name: string;
  price: number;
}

export interface Seat {
  id: number;
  ownerId?: string;
  ownerName?: string;
  status: 'available' | 'pending' | 'sold';
  pendingBuyerId?: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  summary?: string;
  publishedAt: string;
}

export interface EconomyState {
  sessionCode: string;
  schoolLevel: SchoolLevel;
  autoApproveRealEstate: boolean;
  quizCountPerDay: number;
}


export type UserRole = 'teacher' | 'student';
export type SchoolLevel = 'elementary' | 'middle' | 'high';

export interface Student {
  id: string; // 학번 (예: 20101)
  name: string;
  grade: string;
  class: string;
  number: string;
  password?: string;
  salary: number; // 주급
  balance: number; // 입출금통장 (현금)
  bank_balance: number; // 은행 저축 (이자 발생)
  brokerage_balance: number; // 증권 예수금 (투자용)
  teacher_id: string;
  last_salary_date?: string;
  last_quiz_date?: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: [string, string, string, string];
  answer: number; // 0-3
  reward: number;
  teacher_id: string;
  created_at?: string;
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
  teacher_id: string;
}

export interface Seat {
  id: number;
  owner_id?: string;
  owner_name?: string;
  status: 'available' | 'pending' | 'sold';
  pending_buyer_id?: string;
  teacher_id: string;
}

export interface EconomySettings {
  teacher_id: string;
  session_code: string;
  school_level: SchoolLevel;
  auto_approve_estate: boolean;
  quiz_count_per_day: number;
}

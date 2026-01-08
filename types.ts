
export type UserRole = 'teacher' | 'student';
export type SchoolLevel = 'elementary' | 'middle' | 'high';

export interface Student {
  id: string; // 학번 (예: 20201)
  name: string;
  grade: string;
  class: string;
  number: string;
  password?: string;
  salary: number; // 주급
  balance: number; // 입출금통장 (현금)
  bank_balance: number; // 은행 저축
  brokerage_balance: number; // 증권 예수금
  teacher_id: string;
  session_code: string;
  last_salary_date?: string;
  last_quiz_date?: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: [string, string, string, string];
  answer: number;
  reward: number;
  teacher_id: string;
  created_at?: string;
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
  id: string;
  teacher_id: string;
  class_name: string;
  session_code: string;
  school_level: SchoolLevel;
  auto_approve_estate: boolean;
  quiz_count_per_day: number;
  tax_day?: number; // 0-6
  tax_time?: string; // "HH:mm"
  tax_amount?: number;
  last_auto_tax_date?: string;
}

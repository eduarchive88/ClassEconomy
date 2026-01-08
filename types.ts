
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
  balance: number; // 현금
  bank_balance: number; // 은행
  brokerage_balance: number; // 증권
  teacher_id: string;
  session_code: string;
}

export interface Transaction {
  id: string;
  session_code: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  receiver_name: string;
  amount: number;
  type: 'transfer' | 'tax' | 'salary' | 'market' | 'stock' | 'fine' | 'reward' | 'interest' | 'quiz';
  description: string;
  created_at: string;
}

export interface SavingsRecord {
  id: string;
  student_id: string;
  amount: number;
  account_type: 'bank' | 'brokerage';
  created_at: string;
}

export interface EconomySettings {
  id: string;
  teacher_id: string;
  class_name: string;
  session_code: string;
  school_level: SchoolLevel;
  auto_approve_estate: boolean;
  quiz_count_per_day: number;
  tax_day?: number;
  tax_time?: string;
  tax_amount?: number;
  salary_day?: number;
  salary_time?: string;
  last_auto_tax_date?: string;
  last_auto_salary_date?: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  answer: number;
  reward: number;
  teacher_id: string;
  session_code: string;
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

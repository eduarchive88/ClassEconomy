
export type UserRole = 'teacher' | 'student';
export type SchoolLevel = 'elementary' | 'middle' | 'high';

export interface Student {
  id: string; // 학번
  name: string;
  password?: string;
  salary: number; // 주급
  balance: number; // 현금
  bank_balance: number; // 은행
  brokerage_balance: number; // 증권
  teacher_id: string;
  session_code: string;
  created_at?: string;
}

export interface Transaction {
  id: string;
  session_code: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  receiver_name: string;
  amount: number;
  type: 'transfer' | 'tax' | 'salary' | 'market' | 'stock' | 'fine' | 'reward' | 'interest' | 'quiz' | 'real_estate';
  description: string;
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

export interface Seat {
  id: string;
  row_idx: number;
  col_idx: number;
  owner_id?: string;
  owner_name?: string;
  price_at_buy?: number;
  status: 'available' | 'pending' | 'sold';
  session_code: string;
}

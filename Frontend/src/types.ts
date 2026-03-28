
export interface AbendLog {
  log_id: number;
  log_number: number;
  subsystem: string;
  composite: string;
  program: string;
  abend_code: string;
  job_name: string;
  job_number: string;
  step: string;
  abend_date: string; // Stored as YYYY-MM-DD
  entered_by?: string;
  entered_time?: string;
  entered_date?: string;
  updated_by?: string;
  updated_time?: string;
  updated_date?: string;
  se_name: string;
  description: string;
  files: string;
  category: string;
  problem_detail: string;
  resolution_steps: string;
  recovery_required: string;
  results_code: string;
  prevention_note: string;
}

export type AbendLogFilter = Partial<Pick<AbendLog, 'subsystem' | 'composite' | 'program' | 'abend_code' | 'job_name' | 'se_name'>> & {
  log_number?: string;
  year?: string;
  mmdd?: string;
};

export interface PaginatedLogResponse {
  logs: AbendLog[];
  totalCount: number;
}

export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface User {
  user_id: string;
  role: UserRole;
  is_active: boolean;
  must_reset_pw: boolean;
  last_login_at: string | null;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface SessionData {
  user_id: string;
  role: UserRole;
  login_mode: 'user' | 'admin';
  login_at: string;
  last_activity_at: string;
  token: string;
  display_name: string;
  must_reset_pw: boolean;
}

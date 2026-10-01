import type { QuizSubject } from "@/lib/quiz-bank";

// Row shapes for the parent dashboard (/parent/dashboard).

export interface ChildRow {
  id: string;
  display_name: string;
  avatar: string | null;
}
export interface TxRow {
  id: string;
  child_id: string;
  amount: number;
  reference_task_id: string | null;
  goal_id: string | null;
  created_at: string | null;
  type: string;
}
export interface TaskRow {
  id: string;
  title: string;
  reward_amount: number;
  status: string;
  child_id: string;
  created_at: string | null;
}

/** Household settings as last loaded from household_settings. */
export interface DashboardSettings {
  savingsPct: number;
  quizSubjects: QuizSubject[];
  quizReward: number;
}

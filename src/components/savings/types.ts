export type CyclePeriod = "day" | "week" | "month";
export type DepositSource = "wallet" | "savings";

export interface GoalRow {
  id: string;
  title: string;
  target_amount: number;
  cycle_amount: number;
  cycle_period: CyclePeriod;
  status: "active" | "completed" | "cancelled";
}

export interface TxRow {
  id: string;
  amount: number;
  type: string;
  goal_id: string | null;
  reference_task_id: string | null;
  created_at: string | null;
}

export const periodLabel: Record<CyclePeriod, string> = {
  day: "יום",
  week: "שבוע",
  month: "חודש",
};

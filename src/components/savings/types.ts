// Shared shapes for the child savings feature (/child/savings).

export type CyclePeriod = "day" | "week" | "month";
export type DepositSource = "wallet" | "savings";

export interface GoalRow {
  id: string;
  title: string;
  target_amount: number;
  cycle_amount: number;
  cycle_period: CyclePeriod;
  status: "active" | "completed" | "cancelled";
  /** Daily pg_cron job deposits `cycle_amount` from `auto_source` when due. */
  auto_deposit: boolean;
  auto_source: DepositSource;
  /** Asia/Jerusalem date (YYYY-MM-DD) of the next auto deposit; set by a DB trigger. */
  next_auto_deposit_on: string | null;
  /** 'insufficient' = the last run found too little money; it retries daily. */
  last_auto_status: "deposited" | "insufficient" | null;
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

export const sourceFromLabel: Record<DepositSource, string> = {
  wallet: "מהארנק",
  savings: "מהחיסכון",
};

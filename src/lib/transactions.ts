import { CheckCircle2, Coins, Pencil, PiggyBank, Target, type LucideIcon } from "lucide-react";

export const WALLET_TX_TYPES = ["task_reward", "manual_adjustment", "wallet_debit"] as const;
export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

const WALLET_TX_SET = new Set<string>(WALLET_TX_TYPES);

export function isWalletTx(type: string): boolean {
  return WALLET_TX_SET.has(type);
}

export interface BalanceTx {
  amount: number;
  type: string;
  goal_id?: string | null;
}

export function computeWalletBalance(txs: BalanceTx[]): number {
  return txs.reduce((sum, t) => (isWalletTx(t.type) ? sum + t.amount : sum), 0);
}

export function computeSavingsBalance(txs: BalanceTx[]): number {
  return txs.reduce((sum, t) => (t.type === "savings_credit" ? sum + t.amount : sum), 0);
}

export function computeGoalDeposits(txs: BalanceTx[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === "goal_credit" && t.goal_id) {
      m[t.goal_id] = (m[t.goal_id] ?? 0) + t.amount;
    }
  }
  return m;
}

export interface DescribeTxInput {
  type: string;
  reference_task_id?: string | null;
  goal_id?: string | null;
}

export interface TxDescription {
  Icon: LucideIcon;
  label: string;
}

export function describeTx(
  tx: DescribeTxInput,
  taskTitle: string | undefined,
  goalTitle: string | undefined,
): TxDescription {
  switch (tx.type) {
    case "task_reward":
      return { Icon: CheckCircle2, label: taskTitle ?? "תגמול ממשימה" };
    case "manual_adjustment":
      return { Icon: Pencil, label: "התאמה ידנית" };
    case "wallet_debit":
      if (tx.goal_id) {
        return { Icon: Target, label: goalTitle ? `הפקדה: ${goalTitle}` : "הפקדה למטרה" };
      }
      if (tx.reference_task_id) {
        return {
          Icon: PiggyBank,
          label: taskTitle ? `חיסכון אוטומטי מ${taskTitle}` : "חיסכון אוטומטי",
        };
      }
      return { Icon: PiggyBank, label: "העברה לחיסכון" };
    case "savings_credit":
      if (tx.goal_id) {
        return { Icon: Target, label: goalTitle ? `הפקדה: ${goalTitle}` : "הפקדה למטרה" };
      }
      if (tx.reference_task_id) {
        return {
          Icon: PiggyBank,
          label: taskTitle ? `חיסכון אוטומטי מ${taskTitle}` : "חיסכון אוטומטי",
        };
      }
      return { Icon: PiggyBank, label: "העברה לחיסכון" };
    case "goal_credit":
      return { Icon: Target, label: goalTitle ? `מטרה: ${goalTitle}` : "הפקדה למטרה" };
    default:
      return { Icon: Coins, label: "תנועה" };
  }
}

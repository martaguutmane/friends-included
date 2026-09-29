import type { Allocation, EmployeeKey, Project } from "./domain";

export type DeliveryState = "not_required" | "pending" | "sent" | "failed";
export type SyncState = "pending" | "synced" | "failed";

export interface Sale {
  id: string; reference: string; submitted_at: string; submitted_by: EmployeeKey;
  origin: "website" | "telegram"; original_chat_id: string | null;
  customer: string; project: Project; description: string; amount_cents: number;
  proposed_richard: number; proposed_anastasia: number; proposed_jean_claude: number;
  final_richard: number | null; final_anastasia: number | null; final_jean_claude: number | null;
  commission_pool_cents: number; commission_richard_cents: number; commission_anastasia_cents: number; commission_jean_claude_cents: number;
  status: "pending" | "approved"; approved_at: string | null; approved_by: EmployeeKey | null;
  sheet_sync_status: SyncState; sheet_sync_error: string | null;
  notification_status: DeliveryState; notification_error: string | null;
}

export interface Expense {
  id: string; reference: string; submitted_at: string; submitted_by: EmployeeKey;
  origin: "website" | "telegram"; original_chat_id: string | null;
  description: string; category: "Materials" | "Travel" | "Other"; amount_cents: number;
  proposed_allocation: Allocation; final_allocation: Allocation | null;
  status: "awaiting_allocation" | "allocated"; allocated_at: string | null; allocated_by: EmployeeKey | null;
  sheet_sync_status: SyncState; sheet_sync_error: string | null;
  notification_status: DeliveryState; notification_error: string | null;
}

export interface Dashboard {
  approvedIncome: Record<Project, number>;
  commissions: Record<Project, number>;
  allocatedExpenses: Record<Project, number>;
  projectResult: Record<Project, number>;
  companyOverhead: number;
  awaitingAllocation: number;
  companyResult: number;
  pendingSales: number;
  pendingExpenseAllocations: number;
  earned: { richard: number; anastasia: number; jeanClaude: number };
}

import type { z } from "zod";
import { adminDb } from "./supabase";
import { assertRole } from "./auth";
import { cents, expenseApprovalSchema, expenseInputSchema, saleApprovalSchema, saleInputSchema, type EmployeeKey } from "./domain";
import { syncExpense, syncSale } from "./sheets";
import { expenseApprovalMessage, saleApprovalMessage, sendTelegram } from "./telegram";
import type { Expense, Sale } from "./types";

type Origin = { origin: "website" | "telegram"; chatId?: string };

async function markSync(table: "sales" | "expenses", id: string, status: "synced" | "failed", error?: string) {
  await adminDb().from(table).update({ sheet_sync_status: status, sheet_sync_error: error ?? null }).eq("id", id);
}

async function attemptSync(kind: "sale" | "expense", row: Sale | Expense) {
  try {
    if (kind === "sale") await syncSale(row as Sale); else await syncExpense(row as Expense);
    await markSync(kind === "sale" ? "sales" : "expenses", row.id, "synced");
  } catch (error) {
    await markSync(kind === "sale" ? "sales" : "expenses", row.id, "failed", error instanceof Error ? error.message : "Unknown sync error");
  }
}

export async function createSale(actor: EmployeeKey, raw: unknown, source: Origin) {
  assertRole(actor, ["salesperson"]);
  const input = saleInputSchema.parse(raw);
  const { data, error } = await adminDb().rpc("create_sale", { p: {
    reference: input.reference,
    customer: input.customer,
    project: input.project,
    description: input.description,
    amount_cents: cents(input.amount),
    proposed_richard: input.proposedRichard,
    proposed_anastasia: input.proposedAnastasia,
    proposed_jean_claude: input.proposedJeanClaude,
    submitted_by: actor,
    origin: source.origin,
    original_chat_id: source.chatId ?? "",
  } });
  if (error) throw new Error(error.code === "23505" ? "That reference already exists" : error.message);
  const row = data as Sale;
  await attemptSync("sale", row);
  return row;
}

export async function createExpense(actor: EmployeeKey, raw: unknown, source: Origin) {
  assertRole(actor, ["expense_reporter"]);
  const input = expenseInputSchema.parse(raw);
  const { data, error } = await adminDb().rpc("create_expense", { p: {
    reference: input.reference,
    description: input.description,
    category: input.category,
    amount_cents: cents(input.amount),
    proposed_allocation: input.proposedAllocation,
    submitted_by: actor,
    origin: source.origin,
    original_chat_id: source.chatId ?? "",
  } });
  if (error) throw new Error(error.code === "23505" ? "That reference already exists" : error.message);
  const row = data as Expense;
  await attemptSync("expense", row);
  return row;
}

async function recipientFor(submitter: EmployeeKey, original: string | null) {
  if (original) return original;
  const { data } = await adminDb().from("employees").select("telegram_chat_id").eq("key", submitter).single();
  return data?.telegram_chat_id ? String(data.telegram_chat_id) : null;
}

async function attemptNotification(table: "sales" | "expenses", row: Sale | Expense, message: string) {
  const recipient = await recipientFor(row.submitted_by, row.original_chat_id);
  if (!recipient) { await adminDb().from(table).update({ notification_status: "not_required", notification_error: "No Telegram recipient linked" }).eq("id", row.id); return; }
  try { await sendTelegram(recipient, message); await adminDb().from(table).update({ notification_status: "sent", notification_error: null }).eq("id", row.id); }
  catch (error) { await adminDb().from(table).update({ notification_status: "failed", notification_error: error instanceof Error ? error.message : "Unknown notification error" }).eq("id", row.id); }
}

export async function approveSale(actor: EmployeeKey, raw: unknown) {
  assertRole(actor, ["manager"]); const input = saleApprovalSchema.parse(raw);
  const { data, error } = await adminDb().rpc("approve_sale", { p_ref: input.reference, p_r: input.richard, p_a: input.anastasia, p_j: input.jeanClaude });
  if (error) throw new Error(error.message); const row = data as Sale;
  await attemptSync("sale", row); await attemptNotification("sales", row, saleApprovalMessage(row)); return row;
}

export async function approveExpense(actor: EmployeeKey, raw: unknown) {
  assertRole(actor, ["manager"]); const input = expenseApprovalSchema.parse(raw);
  const { data, error } = await adminDb().rpc("allocate_expense", { p_ref: input.reference, p_allocation: input.finalAllocation });
  if (error) throw new Error(error.message); const row = data as Expense;
  await attemptSync("expense", row); await attemptNotification("expenses", row, expenseApprovalMessage(row)); return row;
}

export async function retrySync(actor: EmployeeKey, kind: "sale" | "expense", reference: string) {
  assertRole(actor, ["manager"]); const table = kind === "sale" ? "sales" : "expenses";
  const { data, error } = await adminDb().from(table).select("*").eq("reference", reference).single();
  if (error) throw new Error(error.message); await attemptSync(kind, data as Sale | Expense);
}

export async function retryNotification(actor: EmployeeKey, kind: "sale" | "expense", reference: string) {
  assertRole(actor, ["manager"]); const table = kind === "sale" ? "sales" : "expenses";
  const { data, error } = await adminDb().from(table).select("*").eq("reference", reference).single();
  if (error) throw new Error(error.message);
  const row = data as Sale | Expense; const message = kind === "sale" ? saleApprovalMessage(row as Sale) : expenseApprovalMessage(row as Expense);
  await attemptNotification(table, row, message);
}

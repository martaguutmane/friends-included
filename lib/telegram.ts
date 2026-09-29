import { EMPLOYEES, euros } from "./domain";
import type { Expense, Sale } from "./types";

export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot token is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) });
  if (!response.ok) throw new Error(`Telegram send failed (${response.status})`);
}

export function saleApprovalMessage(s: Sale) {
  const changed = s.proposed_richard !== s.final_richard || s.proposed_anastasia !== s.final_anastasia || s.proposed_jean_claude !== s.final_jean_claude;
  return `Sale ${s.reference} approved${changed ? " — commission split changed" : ""}. Sale ${euros(s.amount_cents)}; total commission ${euros(s.commission_pool_cents)}. Richard: ${s.proposed_richard}% → ${s.final_richard}% (${euros(s.commission_richard_cents)}). Anastasia: ${s.proposed_anastasia}% → ${s.final_anastasia}% (${euros(s.commission_anastasia_cents)}). Jean-Claude: ${s.proposed_jean_claude}% → ${s.final_jean_claude}% (${euros(s.commission_jean_claude_cents)}).`;
}

export function expenseApprovalMessage(e: Expense) {
  const changed = e.proposed_allocation !== e.final_allocation;
  return `Expense ${e.reference}${changed ? " — allocation changed" : " — allocation confirmed"}. ${euros(e.amount_cents)}: ${e.description}. Proposed: ${e.proposed_allocation}. Approved: ${e.final_allocation}.`;
}

export function submissionMessage(kind: "Sale" | "Expense", reference: string, cents: number, destination: string, status: string) {
  return `${kind} ${reference} recorded. Amount: ${euros(cents)}. ${kind === "Sale" ? "Project" : "Proposed allocation"}: ${destination}. Status: ${status}.`;
}

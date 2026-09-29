"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { currentEmployee } from "@/lib/auth";
import { employeeKeys, type EmployeeKey } from "@/lib/domain";
import { approveExpense, approveSale, createExpense, createSale, retryNotification, retrySync } from "@/lib/service";
import { adminDb } from "@/lib/supabase";

export type ActionState = { ok: boolean; message: string };

function fields(form: FormData) { return Object.fromEntries(form.entries()); }
async function run(fn: () => Promise<unknown>): Promise<ActionState> {
  try { await fn(); revalidatePath("/"); return { ok: true, message: "Saved successfully" }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Request failed" }; }
}

export async function selectRole(form: FormData) {
  const role = String(form.get("role"));
  if (!employeeKeys.includes(role as EmployeeKey)) throw new Error("Invalid role");
  (await cookies()).set("demo-role", role, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  revalidatePath("/");
}

export async function submitSale(_: ActionState, form: FormData) { const actor = await currentEmployee(); return run(() => createSale(actor, fields(form), { origin: "website" })); }
export async function submitExpense(_: ActionState, form: FormData) { const actor = await currentEmployee(); return run(() => createExpense(actor, fields(form), { origin: "website" })); }
export async function decideSale(_: ActionState, form: FormData) { const actor = await currentEmployee(); return run(() => approveSale(actor, fields(form))); }
export async function decideExpense(_: ActionState, form: FormData) { const actor = await currentEmployee(); return run(() => approveExpense(actor, fields(form))); }
export async function retryIntegration(form: FormData) {
  const actor = await currentEmployee(); const kind = String(form.get("kind")) as "sale" | "expense"; const reference = String(form.get("reference")); const target = String(form.get("target"));
  await run(() => target === "sheet" ? retrySync(actor, kind, reference) : retryNotification(actor, kind, reference)); revalidatePath("/");
}

export async function linkTelegram(_: ActionState, form: FormData) {
  const actor = await currentEmployee();
  return run(async () => {
    if (actor !== "svetlana") throw new Error("Only Svetlana can link Telegram users");
    const employee = String(form.get("employee")) as EmployeeKey;
    if (!employeeKeys.includes(employee)) throw new Error("Invalid employee");
    const userId = BigInt(String(form.get("telegramUserId"))); const chatId = BigInt(String(form.get("telegramChatId")));
    const db = adminDb(); await db.from("employees").update({ telegram_user_id: null, telegram_chat_id: null }).eq("telegram_user_id", userId.toString());
    const { error } = await db.from("employees").update({ telegram_user_id: userId.toString(), telegram_chat_id: chatId.toString() }).eq("key", employee);
    if (error) throw new Error(error.message);
  });
}

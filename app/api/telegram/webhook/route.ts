import { NextRequest, NextResponse } from "next/server";
import { EMPLOYEES, type EmployeeKey } from "@/lib/domain";
import { createExpense, createSale } from "@/lib/service";
import { adminDb } from "@/lib/supabase";
import { sendTelegram, submissionMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const update = await request.json(); const message = update.message; if (!message?.from?.id || !message?.chat?.id || !message?.text) return NextResponse.json({ ok: true });
  const chatId = String(message.chat.id); const db = adminDb();
  const { data: employee } = await db.from("employees").select("key").eq("telegram_user_id", String(message.from.id)).maybeSingle();
  if (!employee) { await sendTelegram(chatId, "Your Telegram user ID is not linked. Ask Svetlana to link it in manager setup."); return NextResponse.json({ ok: true }); }
  const actor = employee.key as EmployeeKey;
  try {
    const match = String(message.text).trim().match(/^(\/\w+)(?:\s+([\s\S]*))?$/); const command = match?.[1] ?? ""; const body = match?.[2] ?? ""; const p = body.split("|").map((x:string)=>x.trim());
    if (command === "/sale") {
      if (p.length !== 8) throw new Error("Use /sale REF | Customer | A | Description | Amount | Richard% | Anastasia% | Jean-Claude%");
      const row = await createSale(actor,{reference:p[0],customer:p[1],project:p[2],description:p[3],amount:p[4],proposedRichard:p[5],proposedAnastasia:p[6],proposedJeanClaude:p[7]},{origin:"telegram",chatId});
      await sendTelegram(chatId,submissionMessage("Sale",row.reference,row.amount_cents,row.project,"Pending approval"));
    } else if (command === "/expense") {
      if (p.length !== 5) throw new Error("Use /expense REF | Description | Materials|Travel|Other | Amount | A|B|Company overhead");
      const allocation = /^company/i.test(p[4]) ? "COMPANY" : p[4].toUpperCase();
      const row = await createExpense(actor,{reference:p[0],description:p[1],category:p[2],amount:p[3],proposedAllocation:allocation},{origin:"telegram",chatId});
      await sendTelegram(chatId,submissionMessage("Expense",row.reference,row.amount_cents,row.proposed_allocation,row.status === "allocated" ? "Allocated" : "Awaiting allocation"));
    } else await sendTelegram(chatId,`Hello ${EMPLOYEES[actor].name}. Send /sale or /expense using the format shown on the website.`);
  } catch (error) { await sendTelegram(chatId,`Not recorded: ${error instanceof Error ? error.message : "Invalid request"}`); }
  return NextResponse.json({ ok: true });
}

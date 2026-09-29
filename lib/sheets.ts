import { google } from "googleapis";
import { readFileSync } from "node:fs";
import { EMPLOYEES } from "./domain";
import type { Expense, Sale } from "./types";

const SALES_HEADER = ["Reference","Submission time","Salesperson","Customer","Project","Description","Amount","Proposed Richard %","Proposed Anastasia %","Proposed Jean-Claude %","Approved Richard %","Approved Anastasia %","Approved Jean-Claude %","Richard commission","Anastasia commission","Jean-Claude commission","Status"];
const EXPENSES_HEADER = ["Reference","Submission time","Reporter","Description","Category","Amount","Proposed allocation","Final allocation","Status"];

function client() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if ((!email || !key) && process.env.GOOGLE_CREDENTIALS_FILE) {
    const credentials = JSON.parse(readFileSync(process.env.GOOGLE_CREDENTIALS_FILE, "utf8"));
    email = credentials.client_email;
    key = credentials.private_key;
  }
  if (!email || !key || !process.env.GOOGLE_SPREADSHEET_ID) throw new Error("Google Sheets environment variables are not configured");
  const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return google.sheets({ version: "v4", auth });
}

async function upsert(tab: "Sales" | "Expenses", reference: string, values: Array<string | number>, header: string[]) {
  const sheets = client();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:A` });
  const rows = existing.data.values ?? [];
  if (rows.length === 0) await sheets.spreadsheets.values.update({ spreadsheetId, range: `${tab}!A1`, valueInputOption: "RAW", requestBody: { values: [header] } });
  const rowIndex = rows.findIndex((row) => row[0] === reference);
  const row = rowIndex >= 0 ? rowIndex + 1 : Math.max(2, rows.length + 1);
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${tab}!A${row}`, valueInputOption: "USER_ENTERED", requestBody: { values: [values] } });
}

export async function syncSale(s: Sale) {
  await upsert("Sales", s.reference, [s.reference,s.submitted_at,EMPLOYEES[s.submitted_by].name,s.customer,s.project,s.description,s.amount_cents/100,s.proposed_richard,s.proposed_anastasia,s.proposed_jean_claude,s.final_richard ?? "",s.final_anastasia ?? "",s.final_jean_claude ?? "",s.commission_richard_cents/100,s.commission_anastasia_cents/100,s.commission_jean_claude_cents/100,s.status], SALES_HEADER);
}

export async function syncExpense(e: Expense) {
  await upsert("Expenses", e.reference, [e.reference,e.submitted_at,EMPLOYEES[e.submitted_by].name,e.description,e.category,e.amount_cents/100,e.proposed_allocation,e.final_allocation ?? "",e.status], EXPENSES_HEADER);
}

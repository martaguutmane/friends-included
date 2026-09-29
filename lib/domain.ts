import { z } from "zod";

export const employeeKeys = ["svetlana", "richard", "anastasia", "jean_claude", "kevin"] as const;
export type EmployeeKey = (typeof employeeKeys)[number];
export type SalespersonKey = "richard" | "anastasia" | "jean_claude";
export type Project = "A" | "B";
export type Allocation = Project | "COMPANY";

export const EMPLOYEES: Record<EmployeeKey, { name: string; role: "manager" | "salesperson" | "expense_reporter" }> = {
  svetlana: { name: "Svetlana de Monte Carlo", role: "manager" },
  richard: { name: 'Richard “Call Me Dick” Darling', role: "salesperson" },
  anastasia: { name: "Anastasia Ferrari", role: "salesperson" },
  jean_claude: { name: "Jean-Claude Bērziņš", role: "salesperson" },
  kevin: { name: "Kevin von Whatever", role: "expense_reporter" },
};

const reference = z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores").transform((v) => v.toUpperCase());
const money = z.coerce.number().finite().positive();
const text = z.string().trim().min(1).max(500);
const percentage = z.coerce.number().int().min(0).max(100);

export const saleInputSchema = z.object({
  reference,
  customer: text,
  project: z.enum(["A", "B"]),
  description: text,
  amount: money,
  proposedRichard: percentage,
  proposedAnastasia: percentage,
  proposedJeanClaude: percentage,
}).superRefine((v, ctx) => {
  if (v.proposedRichard + v.proposedAnastasia + v.proposedJeanClaude !== 100) {
    ctx.addIssue({ code: "custom", message: "Commission percentages must total exactly 100%" });
  }
});

export const expenseInputSchema = z.object({
  reference,
  description: text,
  category: z.enum(["Materials", "Travel", "Other"]),
  amount: money,
  proposedAllocation: z.enum(["A", "B", "COMPANY"]),
});

export const saleApprovalSchema = z.object({
  reference,
  richard: percentage,
  anastasia: percentage,
  jeanClaude: percentage,
}).superRefine((v, ctx) => {
  if (v.richard + v.anastasia + v.jeanClaude !== 100) {
    ctx.addIssue({ code: "custom", message: "Final commission percentages must total exactly 100%" });
  }
});

export const expenseApprovalSchema = z.object({
  reference,
  finalAllocation: z.enum(["A", "B", "COMPANY"]),
});

export function cents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function commissionAmounts(amount: number, split: [number, number, number]) {
  const pool = Math.round(cents(amount) * 0.1);
  const allocations = split.map((share) => Math.round(pool * share / 100));
  const difference = pool - allocations.reduce((a, b) => a + b, 0);
  const largest = Math.max(...split);
  const recipient = split.findIndex((share) => share === largest);
  allocations[recipient] += difference;
  return { pool, richard: allocations[0], anastasia: allocations[1], jeanClaude: allocations[2] };
}

export function euros(valueInCents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(valueInCents / 100);
}

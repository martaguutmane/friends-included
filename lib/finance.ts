import type { Dashboard, Expense, Sale } from "./types";

export function calculateDashboard(sales: Sale[], expenses: Expense[]): Dashboard {
  const result: Dashboard = {
    approvedIncome: { A: 0, B: 0 }, commissions: { A: 0, B: 0 },
    allocatedExpenses: { A: 0, B: 0 }, projectResult: { A: 0, B: 0 },
    companyOverhead: 0, awaitingAllocation: 0, companyResult: 0,
    pendingSales: 0, pendingExpenseAllocations: 0,
    earned: { richard: 0, anastasia: 0, jeanClaude: 0 },
  };
  for (const sale of sales) {
    if (sale.status !== "approved") { result.pendingSales += sale.amount_cents; continue; }
    result.approvedIncome[sale.project] += sale.amount_cents;
    result.commissions[sale.project] += sale.commission_pool_cents;
    result.earned.richard += sale.commission_richard_cents;
    result.earned.anastasia += sale.commission_anastasia_cents;
    result.earned.jeanClaude += sale.commission_jean_claude_cents;
  }
  for (const expense of expenses) {
    if (expense.status === "awaiting_allocation") {
      result.awaitingAllocation += expense.amount_cents;
      result.pendingExpenseAllocations += expense.amount_cents;
    } else if (expense.final_allocation === "COMPANY") result.companyOverhead += expense.amount_cents;
    else if (expense.final_allocation) result.allocatedExpenses[expense.final_allocation] += expense.amount_cents;
  }
  for (const project of ["A", "B"] as const) {
    result.projectResult[project] = result.approvedIncome[project] - result.commissions[project] - result.allocatedExpenses[project];
  }
  result.companyResult = result.approvedIncome.A + result.approvedIncome.B
    - result.commissions.A - result.commissions.B
    - expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);
  return result;
}

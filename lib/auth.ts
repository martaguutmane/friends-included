import { cookies } from "next/headers";
import { EMPLOYEES, employeeKeys, type EmployeeKey } from "./domain";

export async function currentEmployee(): Promise<EmployeeKey> {
  const raw = (await cookies()).get("demo-role")?.value;
  return employeeKeys.includes(raw as EmployeeKey) ? raw as EmployeeKey : "richard";
}

export function assertRole(employee: EmployeeKey, allowed: Array<keyof typeof EMPLOYEES[EmployeeKey] extends never ? never : "manager" | "salesperson" | "expense_reporter">) {
  const role = EMPLOYEES[employee].role;
  if (!allowed.includes(role)) throw new Error("Permission denied for this demonstration role");
}

// backend/mcp/functions/getTopAccounts.ts
import { accounts } from "@/lib/data";

export async function getTopAccounts() {
  const sorted = [...accounts].sort((a, b) => b.revenue - a.revenue);
  return { topAccounts: sorted.slice(0, 5) };
}
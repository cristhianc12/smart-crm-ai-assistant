// backend/mcp/context/crmData.ts
import { accounts } from "@/lib/data";

export async function getCrmContext() {
  return { accounts };
}
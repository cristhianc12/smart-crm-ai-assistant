// backend/app/api/chat/route.ts

export const runtime = 'nodejs';

import { getCrmContext } from "@/mcp/context/crmData";
import { getTopAccounts } from "@/mcp/functions/getTopAccounts";

export async function POST(req: Request) {
  const { message } = await req.json();

  try {
    const crm = await getCrmContext();
    const top = await getTopAccounts();

    const systemPrompt = `You are an AI assistant that helps with CRM data insights.
Here is a list of customer accounts:\n${JSON.stringify(crm.accounts, null, 2)}\n
Top 5 accounts by revenue:\n${JSON.stringify(top.topAccounts, null, 2)}\n
Use this information to answer the user's question clearly.\n`;

    const fullPrompt = `${systemPrompt}\nUser: ${message}\nAssistant:`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: fullPrompt,
        stream: false
      })
    });

    const data = await response.json();

    return Response.json({ reply: { role: "assistant", content: data.response } });

  } catch (err: any) {
    console.error("❌ Ollama error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
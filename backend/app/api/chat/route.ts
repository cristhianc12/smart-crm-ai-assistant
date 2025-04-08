import { NextRequest } from "next/server";

// ✅ Mock CRM data source
const crmAccounts = [
  { name: "Acme Corp", revenue: 120000 },
  { name: "Beta Inc", revenue: 105000 },
  { name: "Gamma Ltd", revenue: 97000 },
  { name: "Delta LLC", revenue: 91000 },
  { name: "Echo Co", revenue: 86000 },
];

// ✅ Build a contextual prompt string
function buildCrmContext() {
  return crmAccounts
    .map((acc, i) => `${i + 1}. ${acc.name} — $${acc.revenue.toLocaleString()}`)
    .join("\n");
}

// ✅ CORS preflight response
function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// ✅ Main POST handler
async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body.message;
  const history = body.history || [];

  // 🧠 Inject CRM knowledge into a system prompt
  const systemContext = `You are a CRM assistant. Here are the top CRM accounts by revenue:\n${buildCrmContext()}\n\nUse this data to respond to the user.`;

  const ollamaRes = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      messages: [
        { role: "system", content: systemContext },
        ...history.map((m: any) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
        { role: "user", content: message },
      ],
      stream: false,
    }),
  });

  const data = await ollamaRes.json();
  console.log("🧠 Ollama response:", data);

  let text = "⚠️ No response from assistant";

  if (data?.message?.content && typeof data.message.content === "string") {
    text = data.message.content;
  }

  const stream = new ReadableStream({
    start(controller) {
      const chunk = `data: ${JSON.stringify({ response: text })}\n\n`;
      controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export { OPTIONS, POST };
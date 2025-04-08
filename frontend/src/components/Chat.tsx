import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChartRenderer } from "./ChartRenderer";

export interface Message {
  role: "user" | "assistant";
  content: string | object;
  timestamp?: string;
}

const STORAGE_KEY = "chat_sessions";

export const Chat: React.FC = () => {
  const [sessionName, setSessionName] = useState("Default Session");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessionList = Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const current = all[sessionName] || [];
    const cleaned = current.filter((m: any) => m?.content?.toString?.().trim());
    setMessages(cleaned);
  }, [sessionName]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[sessionName] = messages;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [messages, sessionName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    const historyWithCurrent = [...messages, userMsg];
    setMessages(historyWithCurrent);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: historyWithCurrent }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let assistantMsg: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data:"));

        for (const line of lines) {
          try {
            const jsonStr = line.replace("data: ", "");
            const parsed = JSON.parse(jsonStr);
            const token = parsed.response;

            if (typeof token === "string") {
              try {
                const maybeChart = JSON.parse(token);
                if (maybeChart && maybeChart.type === "chart") {
                  assistantMsg.content = maybeChart;
                } else {
                  fullContent += token;
                  assistantMsg.content = fullContent;
                }
              } catch {
                fullContent += token;
                assistantMsg.content = fullContent;
              }

              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMsg };
                return updated;
              });
            }
          } catch (err) {
            console.warn("Failed to parse chunk:", line);
          }
        }
      }
    } catch (err) {
      console.error("❌ Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error getting response from assistant.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen text-white bg-gray-900">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-4">🗂 Sessions</h2>
        <div className="flex-1 overflow-y-auto space-y-2">
          {sessionList.map((name) => (
            <button
              key={name}
              onClick={() => setSessionName(name)}
              className={`block w-full text-left px-3 py-2 rounded ${
                name === sessionName
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            const name = prompt("New session name:");
            if (!name) return;
            const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            if (!all[name]) {
              all[name] = [];
              localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
              setSessionName(name);
            }
          }}
          className="mt-4 bg-green-700 hover:bg-green-600 text-white text-sm py-2 rounded"
        >
          ➕ New Session
        </button>

        {/* Session controls */}
        <div className="mt-4 space-y-2 text-sm">
          <button
            onClick={() => {
              const name = prompt("Rename session:");
              if (!name) return;
              const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
              if (all[sessionName]) {
                all[name] = all[sessionName];
                delete all[sessionName];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
                setSessionName(name);
              }
            }}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-1 px-2 rounded"
          >
            ✏️ Rename
          </button>

          <button
            onClick={() => {
              if (!confirm(`Delete session "${sessionName}"?`)) return;
              const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
              delete all[sessionName];
              localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
              const next = Object.keys(all)[0] || "Default Session";
              setSessionName(next);
            }}
            className="w-full bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded"
          >
            🗑 Delete
          </button>

          <button
            onClick={() => {
              if (!confirm("Clear ALL sessions?")) return;
              localStorage.removeItem(STORAGE_KEY);
              setSessionName("Default Session");
            }}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded"
          >
            🧹 Clear All
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full">
        <div className="p-4 border-b border-gray-700 text-lg font-semibold bg-gray-800">
          🤖 CRM Assistant — <span className="text-sm text-gray-400">{sessionName}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex items-start mr-2">
                  <div class="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm">🤖</div>
                </div>
              )}
              <div className={`px-4 py-2 rounded-2xl max-w-[70%] whitespace-pre-wrap ${
                msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-700 text-white rounded-bl-none"
              }`}>
                {msg.role === "assistant" ? (
                  typeof msg.content === "object" && (msg.content as any).type === "chart" ? (
                    <ChartRenderer
                      type={(msg.content as any).chartType}
                      title={(msg.content as any).title}
                      data={(msg.content as any).data}
                    />
                  ) : (
                    <div className="prose prose-invert prose-sm">
                      <ReactMarkdown>{msg.content as string}</ReactMarkdown>
                    </div>
                  )
                ) : (
                  msg.content as string
                )}
                {msg.timestamp && (
                  <div className="text-xs text-gray-300 mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex items-start ml-2">
                  <div className="w-8 h-8 bg-blue-700 text-white rounded-full flex items-center justify-center text-sm">👤</div>
                </div>
              )}
            </div>
          ))}
          {isLoading && <div className="text-sm text-gray-400 italic animate-pulse">Assistant is typing...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-2 bg-gray-800">
          <input
            className="flex-1 bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask about CRM data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
};
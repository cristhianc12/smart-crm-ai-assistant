import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

const LOCAL_STORAGE_KEY = "chat_history";

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", content: input };
    const historyWithCurrent = [...messages, userMsg];
    setMessages(historyWithCurrent);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: historyWithCurrent,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body from server.");

      let assistantMsg: Message = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMsg]);

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk
          .split("\n")
          .map(line => line.trim())
          .filter(line => line);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const token = parsed.response || "";
            assistantMsg.content += token;

            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...assistantMsg };
              return updated;
            });
          } catch {
            console.warn("Failed to parse chunk:", line);
          }
        }
      }
    } catch (err) {
      console.error("❌ Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error getting response from assistant." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] px-4 py-2 rounded-xl whitespace-pre-wrap ${
              msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-white"
            }`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown className="prose prose-invert">{msg.content}</ReactMarkdown>
              ) : msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-sm text-gray-400 italic animate-pulse">Assistant is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-700 pt-4 mt-4 flex gap-2">
        <input
          className="flex-1 bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    </div>
  );
};
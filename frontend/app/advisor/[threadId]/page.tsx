"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePartnerSession } from "../../lib/use-partner-session";
import { fetchWithPartnerRefresh } from "../../lib/auth-refresh";
import { ArrowLeft, Send } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface Message {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  profile_snapshot: Record<string, unknown> | null;
  quotes_snapshot: QuotesSnapshot | null;
  created_at: string;
}

interface QuotesSnapshot {
  quotes: QuoteItem[];
  recommendation: {
    best_value_insurer: string | null;
    top_by_premium: string[];
    notes: string[];
  };
  disclaimer: string;
}

interface QuoteItem {
  insurer_code: string;
  success: boolean;
  final_premium: number | null;
  premium: number | null;
  gst: number | null;
  idv: number | null;
  error_message: string | null;
}

interface ThreadDetail {
  id: string;
  title: string | null;
  status: string;
  is_live: boolean;
  customer_profile: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

function QuoteCard({ snapshot }: { snapshot: QuotesSnapshot }) {
  const { quotes, recommendation, disclaimer } = snapshot;
  const successful = quotes.filter((q) => q.success && q.final_premium != null);

  if (successful.length === 0) {
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        No quotes were returned successfully. Please verify the vehicle details
        and try again.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">
        Quote Comparison
      </h4>
      <div className="space-y-2">
        {successful.map((q) => {
          const isBest =
            q.insurer_code === recommendation.best_value_insurer;
          return (
            <div
              key={q.insurer_code}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                isBest
                  ? "border-green-300 bg-green-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div>
                <span className="text-sm font-medium text-slate-900">
                  {q.insurer_code}
                </span>
                {isBest && (
                  <span className="ml-2 rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
                    Best Value
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  INR {q.final_premium?.toLocaleString("en-IN")}
                </p>
                {q.idv != null && (
                  <p className="text-xs text-slate-500">
                    IDV: INR {q.idv.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {recommendation.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {recommendation.notes.map((n, i) => (
            <li key={i}>&bull; {n}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs italic text-slate-400">{disclaimer}</p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const params = useParams();
  const threadId = params.threadId as string;
  const router = useRouter();
  const { partnerToken, partnerReady } = usePartnerSession();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!partnerReady || !partnerToken) return;
    loadThread();
  }, [partnerReady, partnerToken, threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function loadThread() {
    if (!partnerToken) return;
    setLoading(true);
    try {
      const res = await fetchWithPartnerRefresh(
        API,
        `${API}/v1/partner/advisor/threads/${threadId}`,
        partnerToken
      );
      if (res.ok) {
        const data: ThreadDetail = await res.json();
        setThread(data);
        setMessages(data.messages);
      } else if (res.status === 404) {
        router.push("/advisor");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !partnerToken || sending) return;

    setInput("");
    setSending(true);

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      thread_id: threadId,
      role: "user",
      content: text,
      profile_snapshot: null,
      quotes_snapshot: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetchWithPartnerRefresh(
        API,
        `${API}/v1/partner/advisor/threads/${threadId}/messages`,
        partnerToken,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        }
      );
      if (res.ok) {
        const newMsgs: Message[] = await res.json();
        // Replace temp message with real messages
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          ...newMsgs,
        ]);
      }
    } catch {
      // keep optimistic message, user can retry
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!partnerReady) return null;
  if (!partnerToken) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p>Please log in to access the AI Advisor.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={() => router.push("/advisor")}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-900">
            {thread?.title || "New conversation"}
          </h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-slate-500">
              Start by telling me about the vehicle you&apos;d like to insure.
              I&apos;ll help you compare quotes from multiple insurers.
            </p>
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-900 border border-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </p>
                {msg.quotes_snapshot && (
                  <QuoteCard snapshot={msg.quotes_snapshot} />
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-200 bg-white">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            style={{ maxHeight: "120px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePartnerSession } from "../lib/use-partner-session";
import { fetchWithPartnerRefresh } from "../lib/auth-refresh";
import { Bot, MessageSquare, Plus } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface Thread {
  id: string;
  title: string | null;
  status: string;
  is_live: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdvisorPage() {
  const { partnerToken, partnerReady } = usePartnerSession();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!partnerReady || !partnerToken) return;
    fetchThreads();
  }, [partnerReady, partnerToken]);

  async function fetchThreads() {
    if (!partnerToken) return;
    setLoading(true);
    try {
      const res = await fetchWithPartnerRefresh(
        API,
        `${API}/v1/partner/advisor/threads`,
        partnerToken
      );
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function createThread() {
    if (!partnerToken || creating) return;
    setCreating(true);
    try {
      const res = await fetchWithPartnerRefresh(
        API,
        `${API}/v1/partner/advisor/threads`,
        partnerToken,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_live: false }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        router.push(`/advisor/${data.id}`);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">AI Advisor</h1>
        <button
          onClick={createThread}
          disabled={creating}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading...</div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <Bot className="mb-4 h-12 w-12 text-slate-300" />
          <h2 className="mb-2 text-lg font-semibold text-slate-700">
            No conversations yet
          </h2>
          <p className="mb-6 max-w-sm text-sm text-slate-500">
            Start a new chat to get two-wheeler insurance quotes and comparisons
            with the help of our AI advisor.
          </p>
          <button
            onClick={createThread}
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Start a Conversation
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/advisor/${t.id}`)}
              className="flex w-full items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
            >
              <MessageSquare className="h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {t.title || "New conversation"}
                </p>
                <p className="text-xs text-slate-500">
                  {t.message_count} message{t.message_count !== 1 ? "s" : ""}{" "}
                  &middot; {timeAgo(t.updated_at)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

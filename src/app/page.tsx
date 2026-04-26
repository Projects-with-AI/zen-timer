"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Timer as TimerIcon } from "lucide-react";
import Timer from "@/components/Timer";
import StreakView from "@/components/StreakView";
import WeeklyChart from "@/components/WeeklyChart";
import { Session } from "@/lib/kv";

const STORAGE_KEY = "focus-streak-sessions";

function loadLocalSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Session[];
  } catch {
    // ignore
  }
  return [];
}

function saveLocalSessions(sessions: Session[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data);
      saveLocalSessions(data);
      setError(null);
    } catch {
      // Fallback to localStorage when API is unavailable
      const local = loadLocalSessions();
      setSessions(local);
      if (local.length === 0) {
        setError("Running in offline mode. Sessions will be saved locally.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleSessionComplete = useCallback(
    async (durationMinutes: number, label?: string) => {
      const newSession: Session = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split("T")[0],
        durationMinutes,
        completedAt: new Date().toISOString(),
        label: label?.trim() || "Focus Session",
      };

      // Always save to localStorage first
      setSessions((prev) => {
        const updated = [...prev, newSession];
        saveLocalSessions(updated);
        return updated;
      });

      // Try to sync to server if available
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: newSession.date,
            durationMinutes,
            completedAt: newSession.completedAt,
            label: newSession.label,
          }),
        });
        if (!res.ok) throw new Error("Failed to save session");
        setError(null);
      } catch {
        setError("Session saved locally. Server sync unavailable.");
      }
    },
    []
  );

  const handleLabelSave = useCallback(
    async (id: string) => {
      const trimmed = editValue.trim();
      if (!trimmed) {
        setEditingId(null);
        return;
      }

      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === id ? { ...s, label: trimmed } : s
        );
        saveLocalSessions(updated);
        return updated;
      });
      setEditingId(null);

      try {
        await fetch("/api/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, label: trimmed }),
        });
      } catch {
        // localStorage already updated
      }
    },
    [editValue]
  );

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  return (
    <main className="min-h-screen bg-[radial-gradient(120%_120%_at_50%_0%,hsl(var(--muted))_0%,hsl(var(--background))_46%)]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mb-2 shadow-sm">
            <TimerIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight">Zen Timer</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Build momentum, one session at a time</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Timer Section */}
        <section className="rounded-3xl border border-border/70 bg-card/90 p-5 sm:p-8 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <Timer onSessionComplete={handleSessionComplete} />
        </section>

        {/* Error Banner */}
        {error && (
          <div className="border border-amber-200/80 bg-amber-50/80 text-amber-800 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Streak View */}
          <section className="rounded-3xl border border-border/70 bg-card/90 p-5 sm:p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-20 bg-muted rounded" />
              </div>
            ) : (
              <StreakView sessions={sessions} />
            )}
          </section>

          {/* Weekly Chart */}
          <section className="rounded-3xl border border-border/70 bg-card/90 p-5 sm:p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-32 bg-muted rounded" />
              </div>
            ) : (
              <WeeklyChart sessions={sessions} />
            )}
          </section>
        </div>

        {/* Recent Sessions */}
        <section className="rounded-3xl border border-border/70 bg-card/90 p-5 sm:p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold tracking-tight mb-4">Recent Sessions</h2>
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded-lg" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No sessions yet. Start your first focus timer above!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...sessions]
                .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                .slice(0, 20)
                .map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors rounded-2xl text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {editingId === session.id ? (
                        <input
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleLabelSave(session.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleLabelSave(session.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="px-2 py-1 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 w-full sm:w-48"
                        />
                      ) : (
                        <span
                          className="font-medium cursor-pointer hover:text-primary transition-colors truncate"
                          onClick={() => {
                            setEditingId(session.id);
                            setEditValue(session.label || "Focus Session");
                          }}
                          title="Click to rename"
                        >
                          {session.label || "Focus Session"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                      <span>{session.durationMinutes} min</span>
                      <span className="text-xs">
                        {new Date(session.completedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

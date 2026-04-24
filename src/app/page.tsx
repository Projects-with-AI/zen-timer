"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Timer as TimerIcon, TrendingUp, Calendar } from "lucide-react";
import Timer from "@/components/Timer";
import StreakView from "@/components/StreakView";
import WeeklyChart from "@/components/WeeklyChart";

interface Session {
  id: string;
  date: string;
  durationMinutes: number;
  completedAt: string;
  label?: string;
}

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
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <TimerIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Focus Streak</h1>
            <p className="text-xs text-muted-foreground">Build momentum, one session at a time</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Timer Section */}
        <section className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TimerIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Focus Timer</h2>
          </div>
          <Timer onSessionComplete={handleSessionComplete} />
        </section>

        {/* Error Banner */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Streak View */}
          <section className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Activity</h2>
            </div>
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
          <section className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Weekly Overview</h2>
            </div>
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
        <section className="bg-card border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
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
                    className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-3">
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
                          className="px-2 py-1 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
                        />
                      ) : (
                        <span
                          className="font-medium cursor-pointer hover:text-primary transition-colors"
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
                    <div className="flex items-center gap-4 text-muted-foreground">
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

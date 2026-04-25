"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

interface Session {
  id: string;
  date: string;
  durationMinutes: number;
  completedAt: string;
  label?: string;
}

interface StreakViewProps {
  sessions: Session[];
}

export default function StreakView({ sessions }: StreakViewProps) {
  const days = useMemo(() => {
    const result: { date: string; count: number; label: string; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-CA");
      const count = sessions.filter(
        (s) => new Date(s.completedAt).toLocaleDateString("en-CA") === dateStr
      ).length;
      const isToday = i === 0;

      result.push({
        date: dateStr,
        count,
        label: d.toLocaleDateString("en-US", { weekday: "narrow" }),
        isToday,
      });
    }
    return result;
  }, [sessions]);

  const streak = useMemo(() => {
    let currentStreak = 0;
    const today = new Date().toLocaleDateString("en-CA");
    const todayCount = sessions.filter(
      (s) => new Date(s.completedAt).toLocaleDateString("en-CA") === today
    ).length;

    if (todayCount > 0) currentStreak++;

    for (let i = 1; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-CA");
      const count = sessions.filter(
        (s) => new Date(s.completedAt).toLocaleDateString("en-CA") === dateStr
      ).length;
      if (count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak;
  }, [sessions]);

  const totalSessions = sessions.length;
  const todayCount = days.find((d) => d.isToday)?.count ?? 0;

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-muted";
    if (count === 1) return "bg-emerald-300";
    if (count === 2) return "bg-emerald-400";
    if (count === 3) return "bg-emerald-500";
    if (count >= 4) return "bg-emerald-600";
    return "bg-muted";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Streak</h2>
        <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium">
          <Zap className="w-4 h-4" />
          {streak} day{streak !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{todayCount}</div>
          <div className="text-xs text-muted-foreground">Today</div>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{totalSessions}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{streak}</div>
          <div className="text-xs text-muted-foreground">Streak</div>
        </div>
      </div>

      {/* Day Strip */}
      <div className="flex gap-1.5 justify-between">
        {days.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className={cn(
                "w-full aspect-square rounded-lg transition-all duration-300 relative",
                getIntensityClass(day.count),
                day.isToday && "ring-2 ring-primary ring-offset-2"
              )}
              title={`${day.date}: ${day.count} session${day.count !== 1 ? "s" : ""}`}
            >
              {day.count > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {day.count}
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                day.isToday ? "text-primary" : "text-muted-foreground"
              )}
            >
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground justify-center">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-emerald-300" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

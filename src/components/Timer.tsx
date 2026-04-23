"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Volume2, VolumeX, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_FOCUS_MINUTES = 30;
const DEFAULT_BREAK_MINUTES = 5;

interface TimerProps {
  onSessionComplete: (durationMinutes: number) => void;
}

type TimerMode = "focus" | "break" | "idle";

export default function Timer({ onSessionComplete }: TimerProps) {
  const [mode, setMode] = useState<TimerMode>("idle");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_FOCUS_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const playNotification = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio not available
    }

    if (Notification.permission === "granted") {
      new Notification(mode === "focus" ? "Focus session complete!" : "Break over!", {
        body: mode === "focus" ? "Great job! Time for a break." : "Ready to focus again?",
        icon: "/favicon.ico",
      });
    }
  }, [soundEnabled, mode]);

  const runTimer = useCallback(() => {
    setIsRunning(true);
    setShowComplete(false);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    if (mode === "idle") {
      setMode("focus");
    }

    runTimer();
  }, [runTimer, mode]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    clearTimer();
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    clearTimer();
    setMode("idle");
    setSecondsLeft(DEFAULT_FOCUS_MINUTES * 60);
    setShowComplete(false);
  }, [clearTimer]);

  const startBreak = useCallback(
    (autoStart: boolean = false) => {
      setMode("break");
      setSecondsLeft(DEFAULT_BREAK_MINUTES * 60);
      setShowComplete(false);
      clearTimer();
      if (autoStart) {
        runTimer();
      } else {
        setIsRunning(false);
      }
    },
    [clearTimer, runTimer]
  );

  const startFocus = useCallback(
    (autoStart: boolean = false) => {
      setMode("focus");
      setSecondsLeft(DEFAULT_FOCUS_MINUTES * 60);
      setShowComplete(false);
      clearTimer();
      if (autoStart) {
        runTimer();
      } else {
        setIsRunning(false);
      }
    },
    [clearTimer, runTimer]
  );

  // Handle timer completion
  useEffect(() => {
    if (secondsLeft === 0 && isRunning) {
      clearTimer();
      setIsRunning(false);
      setShowComplete(true);
      playNotification();

      if (mode === "focus") {
        onSessionComplete(DEFAULT_FOCUS_MINUTES);
      }
    }
  }, [secondsLeft, isRunning, mode, clearTimer, playNotification, onSessionComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const totalSeconds =
    mode === "focus" ? DEFAULT_FOCUS_MINUTES * 60 : mode === "break" ? DEFAULT_BREAK_MINUTES * 60 : DEFAULT_FOCUS_MINUTES * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Mode Selector */}
      <div className="flex gap-2 bg-muted p-1 rounded-lg">
        <button
          onClick={() => startFocus()}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            mode === "focus" || mode === "idle"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Focus
        </button>
        <button
          onClick={() => startBreak()}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            mode === "break"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Break
        </button>
      </div>

      {/* Timer Circle */}
      <div className="relative w-64 h-64">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            className={cn(
              "transition-all duration-1000 ease-linear",
              mode === "break" ? "text-amber-500" : "text-emerald-500"
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tabular-nums tracking-tight">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="text-sm text-muted-foreground mt-1 capitalize">
            {mode === "idle" ? "Ready to focus" : mode === "focus" ? "Focus time" : "Break time"}
          </span>
        </div>
      </div>

      {/* Completion Message */}
      {showComplete && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          {mode === "focus" ? "Session complete! Take a break." : "Break over! Ready to focus?"}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!showComplete && (
          <>
            {!isRunning ? (
              <button
                onClick={startTimer}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Play className="w-5 h-5" />
                {mode === "idle" ? "Start Focus" : "Resume"}
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                <Pause className="w-5 h-5" />
                Pause
              </button>
            )}
          </>
        )}

        <button
          onClick={resetTimer}
          className="flex items-center gap-2 px-4 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors",
            soundEnabled
              ? "bg-muted text-foreground hover:bg-muted/80"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          title={soundEnabled ? "Mute" : "Unmute"}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {mode === "focus" && showComplete && (
        <button
          onClick={() => startBreak(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-100 text-amber-700 rounded-lg font-medium hover:bg-amber-200 transition-colors text-sm"
        >
          <Coffee className="w-4 h-4" />
          Start 5-min Break
        </button>
      )}

      {mode === "break" && showComplete && (
        <button
          onClick={() => startFocus(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200 transition-colors text-sm"
        >
          <Play className="w-4 h-4" />
          Start Focus Session
        </button>
      )}
    </div>
  );
}

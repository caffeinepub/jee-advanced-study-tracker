import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Minus,
  Pause,
  Play,
  RotateCcw,
  Square,
  Timer,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  consumePendingSeconds,
  useBackgroundTimer,
} from "../hooks/useBackgroundTimer";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetMyTodaySeconds,
  useGetTodayLeaderboard,
  useRecordStudyTime,
} from "../hooks/useQueries";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function formatTimeBigInt(seconds: bigint): string {
  return formatTime(Number(seconds));
}

const RANK_STYLES = [
  {
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    text: "text-amber-400",
    medal: "🥇",
  },
  {
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
    text: "text-slate-300",
    medal: "🥈",
  },
  {
    bg: "bg-amber-700/10",
    border: "border-amber-700/30",
    text: "text-amber-600",
    medal: "🥉",
  },
];

type StudyMode = "Physics" | "Chemistry" | "Maths" | "Mock" | "General";

const STUDY_MODES: {
  label: StudyMode;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    label: "Physics",
    color: "text-sky-400",
    bg: "bg-sky-400/15",
    border: "border-sky-400/40",
  },
  {
    label: "Chemistry",
    color: "text-violet-400",
    bg: "bg-violet-400/15",
    border: "border-violet-400/40",
  },
  {
    label: "Maths",
    color: "text-amber-400",
    bg: "bg-amber-400/15",
    border: "border-amber-400/40",
  },
  {
    label: "Mock",
    color: "text-red-400",
    bg: "bg-red-400/15",
    border: "border-red-400/40",
  },
  {
    label: "General",
    color: "text-slate-400",
    bg: "bg-slate-400/15",
    border: "border-slate-400/40",
  },
];

export default function TimerPage() {
  const {
    elapsed,
    timerState,
    studyMode,
    setStudyMode,
    notifEnabled,
    start,
    pause,
    stop,
    reset,
    removeSeconds,
  } = useBackgroundTimer();

  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();

  const { data: myTodaySeconds, refetch: refetchMyTime } =
    useGetMyTodaySeconds();
  const { data: leaderboard = [], isLoading: leaderboardLoading } =
    useGetTodayLeaderboard();
  const recordTime = useRecordStudyTime();

  // Pending seconds from previous session that closed with timer running
  const pendingCommittedRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
  useEffect(() => {
    if (pendingCommittedRef.current) return;
    pendingCommittedRef.current = true;
    const pending = consumePendingSeconds();
    if (pending > 0) {
      recordTime.mutate(BigInt(pending), {
        onSuccess: () => refetchMyTime(),
      });
    }
  }, []);

  // Remove-time UI state
  const [removeMinutes, setRemoveMinutes] = useState("");
  const [removeError, setRemoveError] = useState("");

  const handleStart = async () => {
    await start();
  };

  const handlePause = () => {
    pause();
  };

  const handleStop = () => {
    const finalElapsed = stop();
    if (finalElapsed > 0) {
      recordTime.mutate(BigInt(finalElapsed), {
        onSuccess: () => refetchMyTime(),
      });
    }
  };

  const handleReset = () => {
    // Reset discards elapsed without committing
    reset();
  };

  const handleRemoveTime = () => {
    const mins = Number(removeMinutes);
    if (!removeMinutes || Number.isNaN(mins) || mins <= 0) {
      setRemoveError("Enter a valid number of minutes.");
      return;
    }
    if (mins * 60 > elapsed && timerState === "stopped") {
      setRemoveError("Can't remove more time than elapsed.");
      return;
    }
    setRemoveError("");
    removeSeconds(mins * 60);
    setRemoveMinutes("");
  };

  const running = timerState === "running";
  const paused = timerState === "paused";

  const totalToday =
    Number(myTodaySeconds ?? BigInt(0)) + (running || paused ? elapsed : 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Timer className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground select-none">
            Study Timer
          </h1>
          <p className="text-xs text-muted-foreground font-mono select-none">
            Runs in background · Resets at 5:00 AM IST
          </p>
        </div>
        {notifEnabled && (
          <span className="ml-auto text-[10px] font-mono text-emerald-400/70 border border-emerald-400/20 rounded-full px-2 py-0.5 select-none">
            🔔 Notifications on
          </span>
        )}
      </div>

      {/* Background notice banner */}
      {(running || paused) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-400/80 font-mono select-none"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {running
            ? "Timer is running in the background — closing this tab won't stop it."
            : "Timer is paused — your progress is saved."}
        </motion.div>
      )}

      {/* Stopwatch */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`rounded-2xl border p-8 text-center transition-colors ${
          running
            ? "bg-emerald-400/5 border-emerald-400/30"
            : paused
              ? "bg-amber-400/5 border-amber-400/30"
              : "bg-card border-border"
        }`}
      >
        {/* Big time display */}
        <div
          className={`text-7xl md:text-8xl font-mono font-bold tracking-tight leading-none mb-2 select-none transition-colors ${
            running
              ? "text-emerald-400"
              : paused
                ? "text-amber-400"
                : "text-foreground"
          }`}
          style={{
            fontVariantNumeric: "tabular-nums",
            caretColor: "transparent",
          }}
          data-ocid="timer.display"
        >
          {formatTime(elapsed)}
        </div>

        <p
          className={`text-sm font-mono mb-4 select-none transition-colors ${
            running
              ? "text-emerald-400/70"
              : paused
                ? "text-amber-400/70"
                : "text-muted-foreground"
          }`}
        >
          {running
            ? `● Recording · ${studyMode}`
            : paused
              ? `⏸ Paused · ${studyMode}`
              : elapsed > 0
                ? `Stopped · ${studyMode}`
                : "Ready"}
        </p>

        {/* Mode/Subject selector */}
        <div
          className="flex items-center justify-center flex-wrap gap-1.5 mb-8"
          data-ocid="timer.mode_select"
        >
          {STUDY_MODES.map((mode) => {
            const isActive = studyMode === mode.label;
            return (
              <button
                key={mode.label}
                type="button"
                onClick={() => setStudyMode(mode.label)}
                style={{ caretColor: "transparent" }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all select-none ${
                  isActive
                    ? `${mode.bg} ${mode.color} ${mode.border}`
                    : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground/40 hover:text-foreground"
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Start / Resume */}
          {!running && (
            <Button
              onClick={handleStart}
              disabled={recordTime.isPending}
              className="h-12 px-8 text-base font-semibold rounded-xl bg-emerald-400 hover:bg-emerald-500 text-black transition-all"
              data-ocid="timer.start_button"
            >
              <Play className="w-5 h-5 mr-2" />
              {paused ? "Resume" : "Start"}
            </Button>
          )}

          {/* Pause (only when running) */}
          {running && (
            <Button
              onClick={handlePause}
              className="h-12 px-8 text-base font-semibold rounded-xl bg-amber-400 hover:bg-amber-500 text-black transition-all"
              data-ocid="timer.pause_button"
            >
              <Pause className="w-5 h-5 mr-2" />
              Pause
            </Button>
          )}

          {/* Stop — commits to backend */}
          {(running || paused) && (
            <Button
              onClick={handleStop}
              disabled={recordTime.isPending}
              variant="outline"
              className="h-12 px-6 text-base rounded-xl border-red-400/40 text-red-400 hover:bg-red-400/10 hover:text-red-300"
              data-ocid="timer.stop_button"
            >
              {recordTime.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop &amp; Save
                </>
              )}
            </Button>
          )}

          {/* Reset — discards elapsed */}
          {!running && elapsed > 0 && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={recordTime.isPending}
              className="h-12 px-6 text-base rounded-xl border-border text-muted-foreground hover:text-foreground"
              data-ocid="timer.reset_button"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Discard
            </Button>
          )}
        </div>

        {/* Remove time */}
        {(running || paused || elapsed > 0) && (
          <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono select-none">
              Remove minutes:
            </span>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                placeholder="mins"
                value={removeMinutes}
                onChange={(e) => {
                  setRemoveMinutes(e.target.value);
                  setRemoveError("");
                }}
                className="h-7 w-20 text-xs text-center bg-transparent border-border"
                data-ocid="timer.remove_minutes_input"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveTime}
                className="h-7 px-3 text-xs border-border text-muted-foreground hover:text-foreground"
                data-ocid="timer.remove_minutes_button"
              >
                <Minus className="w-3 h-3 mr-1" />
                Remove
              </Button>
            </div>
            {removeError && (
              <span className="text-[10px] text-red-400 w-full text-center select-none">
                {removeError}
              </span>
            )}
          </div>
        )}

        {/* Today's total */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 select-none">
            Your total today
          </p>
          <p className="text-3xl font-mono font-bold text-primary select-none">
            {formatTime(totalToday)}
          </p>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-foreground select-none">
            Today's Leaderboard
          </h2>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground select-none">
            Updates every 30s
          </span>
        </div>

        <div className="p-3 space-y-2" data-ocid="timer.leaderboard.list">
          {leaderboardLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))
          ) : leaderboard.length === 0 ? (
            <div
              className="text-center py-10 text-muted-foreground"
              data-ocid="timer.leaderboard.empty_state"
            >
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm select-none">
                No study time recorded today yet.
              </p>
              <p className="text-xs select-none mt-1">
                Start studying to claim the top spot!
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {leaderboard.map((entry, index) => {
                const isMe = entry.principalText === myPrincipal;
                const rankStyle = RANK_STYLES[index] ?? {
                  bg: "bg-transparent",
                  border: "border-border",
                  text: "text-muted-foreground",
                  medal: null,
                };
                return (
                  <motion.div
                    key={entry.principalText}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    data-ocid={`timer.leaderboard.item.${index + 1}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                      isMe
                        ? "bg-primary/10 border-primary/30"
                        : `${rankStyle.bg} ${rankStyle.border}`
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 shrink-0 text-center">
                      {index < 3 ? (
                        <span className="text-lg">{rankStyle.medal}</span>
                      ) : (
                        <span className="text-sm font-mono text-muted-foreground">
                          #{index + 1}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate select-none ${
                          isMe ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {entry.name || "Anonymous"}
                        {isMe && (
                          <span className="ml-2 text-[10px] font-mono text-primary/70 select-none">
                            (you)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Time */}
                    <div
                      className={`text-sm font-mono font-bold shrink-0 select-none ${
                        isMe ? "text-primary" : rankStyle.text
                      }`}
                    >
                      {formatTimeBigInt(entry.totalSeconds)}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border bg-muted/10">
          <p className="text-[10px] font-mono text-muted-foreground text-center select-none">
            Daily leaderboard resets at 5:00 AM IST · Keep grinding 🔥
          </p>
        </div>
      </motion.div>
    </div>
  );
}

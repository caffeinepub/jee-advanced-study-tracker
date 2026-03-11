/**
 * useBackgroundTimer
 *
 * Persists the timer across tab switches and page closes by storing
 * the start timestamp in localStorage rather than relying on an interval.
 *
 * localStorage keys:
 *   timer_state       : "running" | "paused" | "stopped"
 *   timer_startedAt   : ISO string — wall-clock time when last started/resumed
 *   timer_pausedAt    : number — elapsed seconds at moment of pause
 *   timer_pendingSeconds : number — seconds from a previous session not yet committed
 *   timer_mode        : StudyMode string
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type TimerState = "stopped" | "running" | "paused";

const LS_STATE = "timer_state";
const LS_STARTED_AT = "timer_startedAt";
const LS_PAUSED_AT = "timer_pausedAt";
const LS_PENDING = "timer_pendingSeconds";
const LS_MODE = "timer_mode";

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function removeLS(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/** Compute elapsed seconds from persisted state */
function computeElapsed(): number {
  const state = readLS(LS_STATE);
  if (state === "running") {
    const startedAt = readLS(LS_STARTED_AT);
    const pausedAt = Number(readLS(LS_PAUSED_AT) ?? "0");
    if (startedAt) {
      const wallElapsed = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000,
      );
      return pausedAt + wallElapsed;
    }
  }
  if (state === "paused") {
    return Number(readLS(LS_PAUSED_AT) ?? "0");
  }
  return 0;
}

/** Consume any pending seconds that were saved before a page close */
export function consumePendingSeconds(): number {
  const pending = Number(readLS(LS_PENDING) ?? "0");
  if (pending > 0) removeLS(LS_PENDING);
  return pending;
}

export function useBackgroundTimer() {
  const [elapsed, setElapsed] = useState<number>(() => computeElapsed());
  const [timerState, setTimerState] = useState<TimerState>(
    () => (readLS(LS_STATE) as TimerState | null) ?? "stopped",
  );
  const [studyMode, setStudyModeState] = useState<string>(
    () => readLS(LS_MODE) ?? "General",
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionSavedRef = useRef(false);

  // Notification permission
  const [notifEnabled, setNotifEnabled] = useState(false);

  const requestNotifPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") {
      setNotifEnabled(true);
      return true;
    }
    if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setNotifEnabled(true);
        return true;
      }
    }
    return false;
  }, []);

  const fireNotification = useCallback(
    (elapsed: number) => {
      if (
        !notifEnabled ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      )
        return;
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
      // biome-ignore lint/correctness/noUnusedVariables: fire and forget
      const n = new Notification("Study Timer", {
        body: `You've been studying for ${label}. Keep it up! 🔥`,
        icon: "/favicon.ico",
        silent: false,
        tag: "study-timer",
      });
    },
    [notifEnabled],
  );

  // Tick display every second
  const startTick = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed(computeElapsed());
    }, 1000);
  }, []);

  const stopTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Notification interval every 30 min
  const startNotifInterval = useCallback(
    (currentElapsed: number) => {
      if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
      // Fire every 30 minutes
      const THIRTY_MIN = 30 * 60 * 1000;
      // Calculate when the next 30-min mark hits relative to current elapsed
      const nextFire =
        THIRTY_MIN - ((currentElapsed * 1000) % THIRTY_MIN) || THIRTY_MIN;
      const timeoutId = setTimeout(() => {
        fireNotification(computeElapsed());
        notifIntervalRef.current = setInterval(() => {
          fireNotification(computeElapsed());
        }, THIRTY_MIN);
      }, nextFire);
      // Store timeout id cast to interval ref for cleanup
      notifIntervalRef.current = timeoutId as unknown as ReturnType<
        typeof setInterval
      >;
    },
    [fireNotification],
  );

  const stopNotifInterval = useCallback(() => {
    if (notifIntervalRef.current) {
      clearInterval(notifIntervalRef.current);
      clearTimeout(
        notifIntervalRef.current as unknown as ReturnType<typeof setTimeout>,
      );
      notifIntervalRef.current = null;
    }
  }, []);

  // On mount — restore state
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
  useEffect(() => {
    const state = (readLS(LS_STATE) as TimerState | null) ?? "stopped";
    const currentElapsed = computeElapsed();
    setElapsed(currentElapsed);
    setTimerState(state);

    if (state === "running") {
      startTick();
      if (notifEnabled) startNotifInterval(currentElapsed);
    }

    return () => {
      stopTick();
      stopNotifInterval();
    };
  }, []);

  // Save pending seconds before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = readLS(LS_STATE);
      if (state === "running") {
        const currentElapsed = computeElapsed();
        if (currentElapsed > 0) {
          const existing = Number(readLS(LS_PENDING) ?? "0");
          writeLS(LS_PENDING, String(existing + currentElapsed));
          // Clear the running state so we don't double-count on next load
          writeLS(LS_STATE, "stopped");
          removeLS(LS_STARTED_AT);
          writeLS(LS_PAUSED_AT, "0");
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    sessionSavedRef.current = false;
    const currentPausedAt = Number(readLS(LS_PAUSED_AT) ?? "0");
    writeLS(LS_STATE, "running");
    writeLS(LS_STARTED_AT, new Date().toISOString());
    // pausedAt stays as the accumulated offset
    setTimerState("running");
    const currentElapsed = computeElapsed();
    setElapsed(currentElapsed);
    startTick();

    const granted = await requestNotifPermission();
    if (granted) startNotifInterval(currentElapsed);

    return currentPausedAt;
  }, [startTick, requestNotifPermission, startNotifInterval]);

  const pause = useCallback(() => {
    const currentElapsed = computeElapsed();
    writeLS(LS_STATE, "paused");
    writeLS(LS_PAUSED_AT, String(currentElapsed));
    removeLS(LS_STARTED_AT);
    setTimerState("paused");
    setElapsed(currentElapsed);
    stopTick();
    stopNotifInterval();
  }, [stopTick, stopNotifInterval]);

  /** Stop — returns the final elapsed seconds for the caller to commit */
  const stop = useCallback((): number => {
    const finalElapsed = computeElapsed();
    writeLS(LS_STATE, "stopped");
    writeLS(LS_PAUSED_AT, "0");
    removeLS(LS_STARTED_AT);
    setTimerState("stopped");
    setElapsed(0);
    stopTick();
    stopNotifInterval();
    sessionSavedRef.current = true;
    return finalElapsed;
  }, [stopTick, stopNotifInterval]);

  /** Reset without committing — discards elapsed */
  const reset = useCallback((): number => {
    const finalElapsed = computeElapsed();
    writeLS(LS_STATE, "stopped");
    writeLS(LS_PAUSED_AT, "0");
    removeLS(LS_STARTED_AT);
    setTimerState("stopped");
    setElapsed(0);
    stopTick();
    stopNotifInterval();
    return finalElapsed;
  }, [stopTick, stopNotifInterval]);

  /** Remove N seconds from current session's elapsed */
  const removeSeconds = useCallback((seconds: number) => {
    const currentElapsed = computeElapsed();
    const newElapsed = Math.max(0, currentElapsed - seconds);
    const state = (readLS(LS_STATE) as TimerState | null) ?? "stopped";
    if (state === "running") {
      // Adjust startedAt so elapsed computes correctly
      const newStartedAt = new Date(
        Date.now() - newElapsed * 1000,
      ).toISOString();
      writeLS(LS_STARTED_AT, newStartedAt);
      writeLS(LS_PAUSED_AT, "0");
    } else if (state === "paused") {
      writeLS(LS_PAUSED_AT, String(newElapsed));
    }
    setElapsed(newElapsed);
  }, []);

  const setStudyMode = useCallback((mode: string) => {
    writeLS(LS_MODE, mode);
    setStudyModeState(mode);
  }, []);

  return {
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
  };
}

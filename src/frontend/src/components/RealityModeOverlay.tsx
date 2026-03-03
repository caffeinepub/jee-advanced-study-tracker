import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import React from "react";
import type { Chapter, Resource } from "../backend";
import { useRealityMode } from "../contexts/RealityModeContext";
import { useGetAllChapters, useGetResources } from "../hooks/useQueries";

const JEE_DATE_KEY = "jee_exam_date";
const DEFAULT_JEE_DATE = "2026-05-17";

function getDaysRemaining(): number {
  const stored = localStorage.getItem(JEE_DATE_KEY);
  const dateStr = stored || DEFAULT_JEE_DATE;
  const [year, month, day] = dateStr.split("-").map(Number);
  const examDate = new Date(year, month - 1, day); // local midnight, no UTC offset issue
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const diff = examDate.getTime() - todayMidnight.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function deduplicateSubjectChapters(
  subject: string,
  resources: Resource[],
  chapters: Chapter[],
) {
  const subjectResourceIds = new Set(
    resources.filter((r) => r.subject === subject).map((r) => r.id),
  );
  const subjectChapters = chapters.filter((c) =>
    subjectResourceIds.has(c.resourceId),
  );
  const byName = new Map<string, Chapter[]>();
  for (const ch of subjectChapters) {
    const existing = byName.get(ch.name) || [];
    existing.push(ch);
    byName.set(ch.name, existing);
  }
  const total = byName.size;
  let done = 0;
  let inProgress = 0;
  let notStarted = 0;
  for (const instances of byName.values()) {
    if (instances.every((c) => c.status === "Done")) {
      done += 1;
    } else if (
      instances.some(
        (c) => c.status === "In Progress" || c.status === "Currently Doing",
      )
    ) {
      inProgress += 1;
    } else {
      notStarted += 1;
    }
  }
  return { total, done, inProgress, notStarted };
}

function getBluntStatement(pct: number, days: number): string {
  if (pct < 10)
    return `You've barely started. ${days} days is not as long as you think.`;
  if (pct < 25) return "Less than a quarter done. The clock is ticking.";
  if (pct < 50) return "Halfway is still far away. Stop procrastinating.";
  if (pct < 75) return `Good progress, but don't slow down now.`;
  if (pct < 90) return `Almost there. Don't let up in the final stretch.`;
  return `You're nearly ready. Stay sharp and revise.`;
}

export default function RealityModeOverlay() {
  const { isRealityModeActive, setRealityMode } = useRealityMode();
  const { data: chapters = [] } = useGetAllChapters();
  const { data: resources = [] } = useGetResources();

  if (!isRealityModeActive) return null;

  const daysRemaining = getDaysRemaining();

  // Use the same deduplication as the dashboard so counts match
  const subjects = ["Physics", "Chemistry", "Maths"] as const;
  let total = 0;
  let done = 0;
  let inProgress = 0;
  let notStarted = 0;
  for (const subject of subjects) {
    const s = deduplicateSubjectChapters(subject, resources, chapters);
    total += s.total;
    done += s.done;
    inProgress += s.inProgress;
    notStarted += s.notStarted;
  }

  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;
  const statement = getBluntStatement(completionPct, daysRemaining);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.62 0.22 25) 1px, transparent 1px), linear-gradient(90deg, oklch(0.62 0.22 25) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-2xl w-full px-8 text-center">
        <button
          type="button"
          onClick={() => setRealityMode(false)}
          className="absolute top-0 right-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-center gap-3 mb-8">
          <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse-amber" />
          <h1 className="text-2xl font-bold font-mono tracking-widest text-red-400 uppercase">
            Reality Check
          </h1>
          <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse-amber" />
        </div>

        {/* Days remaining - BIG */}
        <div className="mb-10">
          <div className="text-8xl font-bold font-mono text-foreground leading-none">
            {daysRemaining}
          </div>
          <div className="text-xl font-mono text-muted-foreground mt-2 uppercase tracking-widest">
            Days Remaining
          </div>
        </div>

        {/* Chapter breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-4xl font-bold font-mono text-muted-foreground">
              {notStarted}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-wider">
              Not Started
            </div>
          </div>
          <div className="bg-card border border-amber-400/30 rounded-lg p-4">
            <div className="text-4xl font-bold font-mono text-amber-400">
              {inProgress}
            </div>
            <div className="text-xs font-mono text-amber-400/70 mt-1 uppercase tracking-wider">
              In Progress
            </div>
          </div>
          <div className="bg-card border border-emerald-400/30 rounded-lg p-4">
            <div className="text-4xl font-bold font-mono text-emerald-400">
              {done}
            </div>
            <div className="text-xs font-mono text-emerald-400/70 mt-1 uppercase tracking-wider">
              Done
            </div>
          </div>
        </div>

        {/* Overall completion */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
            <span>OVERALL COMPLETION</span>
            <span className="text-foreground font-semibold">
              {completionPct}%
            </span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${completionPct}%`,
                background:
                  completionPct < 30
                    ? "oklch(0.62 0.22 25)"
                    : completionPct < 60
                      ? "oklch(0.78 0.18 55)"
                      : "oklch(0.65 0.2 145)",
              }}
            />
          </div>
        </div>

        {/* Blunt statement */}
        <p className="text-lg font-semibold text-foreground mb-8 leading-relaxed">
          "{statement}"
        </p>

        <Button
          onClick={() => setRealityMode(false)}
          variant="outline"
          className="border-border text-muted-foreground hover:text-foreground font-mono"
        >
          Back to Work
        </Button>
      </div>
    </div>
  );
}

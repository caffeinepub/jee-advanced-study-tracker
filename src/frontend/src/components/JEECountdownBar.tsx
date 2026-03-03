import { Calendar, Check, Edit2, X } from "lucide-react";
import React, { useState } from "react";
import { useGetAllChapters, useGetResources } from "../hooks/useQueries";

const JEE_DATE_KEY = "jee_exam_date";
const DEFAULT_JEE_DATE = "2026-05-17"; // JEE Advanced 2026 date

function getExamDate(): Date {
  const stored = localStorage.getItem(JEE_DATE_KEY);
  return new Date(stored || DEFAULT_JEE_DATE);
}

function getDaysRemaining(examDate: Date): number {
  const now = new Date();
  const diff = examDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getBarColor(daysRemaining: number): string {
  if (daysRemaining > 180) return "oklch(0.65 0.2 145)"; // green
  if (daysRemaining > 90) return "oklch(0.78 0.18 55)"; // amber
  if (daysRemaining > 30) return "oklch(0.72 0.2 35)"; // orange
  return "oklch(0.62 0.22 25)"; // red
}

function getTimeProgress(examDate: Date): number {
  // Progress from "1 year before" to exam date
  const oneYearBefore = new Date(examDate);
  oneYearBefore.setFullYear(oneYearBefore.getFullYear() - 1);
  const now = new Date();
  const total = examDate.getTime() - oneYearBefore.getTime();
  const elapsed = now.getTime() - oneYearBefore.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export default function JEECountdownBar() {
  const [examDate, setExamDateState] = useState<Date>(getExamDate);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const { data: chapters = [] } = useGetAllChapters();
  const { data: resources = [] } = useGetResources();

  const daysRemaining = getDaysRemaining(examDate);
  const timeProgress = getTimeProgress(examDate);
  const barColor = getBarColor(daysRemaining);

  // Deduplicate chapters by name per subject.
  // A chapter name that appears in multiple resources of the same subject counts as ONE chapter.
  // It's "Done" only if Done in ALL resources of that subject that contain it.
  const subjects = ["Physics", "Chemistry", "Maths"];
  let totalChapters = 0;
  let doneChapters = 0;

  for (const subject of subjects) {
    const subjectResourceIds = new Set(
      resources.filter((r) => r.subject === subject).map((r) => r.id),
    );
    const subjectChapters = chapters.filter((c) =>
      subjectResourceIds.has(c.resourceId),
    );

    // Group chapters by name
    const byName = new Map<string, typeof subjectChapters>();
    for (const ch of subjectChapters) {
      const existing = byName.get(ch.name) || [];
      existing.push(ch);
      byName.set(ch.name, existing);
    }

    // Each unique name = 1 chapter; done only if ALL instances are Done
    totalChapters += byName.size;
    for (const instances of byName.values()) {
      if (instances.every((c) => c.status === "Done")) {
        doneChapters += 1;
      }
    }
  }

  const completionPct =
    totalChapters > 0 ? Math.round((doneChapters / totalChapters) * 100) : 0;

  const startEdit = () => {
    setEditValue(examDate.toISOString().split("T")[0]);
    setEditing(true);
  };

  const saveEdit = () => {
    if (editValue) {
      const newDate = new Date(editValue);
      localStorage.setItem(JEE_DATE_KEY, editValue);
      setExamDateState(newDate);
    }
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  return (
    <div className="bg-card/80 border-b border-border backdrop-blur-sm">
      <div className="px-4 py-2">
        <div className="flex items-center gap-4 mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground shrink-0">
            <Calendar className="w-3 h-3" />
            {editing ? (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="bg-input border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-mono"
                />
                <button
                  type="button"
                  onClick={saveEdit}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="flex items-center gap-1 hover:text-foreground transition-colors group"
              >
                <span className="font-semibold text-foreground">
                  {daysRemaining}
                </span>
                <span>days to JEE Advanced</span>
                <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          <div className="flex-1 relative h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{ width: `${timeProgress}%`, background: barColor }}
            />
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
            <span className="text-muted-foreground">
              <span className="text-foreground font-semibold">
                {completionPct}%
              </span>{" "}
              done
            </span>
            <span className="text-muted-foreground">
              <span className="text-emerald-400 font-semibold">
                {doneChapters}
              </span>
              <span className="text-muted-foreground">/{totalChapters}</span>
              <span className="ml-1">chapters</span>
            </span>
          </div>
        </div>

        {/* Progress bar for chapter completion */}
        <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completionPct}%`,
              background: "oklch(0.65 0.2 145)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

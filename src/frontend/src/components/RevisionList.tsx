import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2, RotateCcw, Trash2 } from "lucide-react";
import React from "react";
import type { Chapter, Resource, RevisionReminder } from "../backend";
import {
  useDeleteRevisionReminder,
  useMarkRevisionComplete,
} from "../hooks/useQueries";

interface RevisionListProps {
  reminders: RevisionReminder[];
  chapters: Chapter[];
  resources: Resource[];
  showDueOnly?: boolean;
}

export default function RevisionList({
  reminders,
  chapters,
  resources,
  showDueOnly = false,
}: RevisionListProps) {
  const markComplete = useMarkRevisionComplete();
  const deleteReminder = useDeleteRevisionReminder();

  const now = Date.now();

  const enriched = reminders.map((r) => {
    const chapter = chapters.find((c) => c.id === r.chapterId);
    const resource = resources.find((res) => res.id === r.resourceId);
    const lastReviewedMs = Number(r.lastReviewed) / 1_000_000;
    const intervalMs = Number(r.intervalDays) * 24 * 60 * 60 * 1000;
    const nextDueMs = lastReviewedMs + intervalMs;
    const isDue = now >= nextDueMs;
    const daysSince = Math.floor(
      (now - lastReviewedMs) / (1000 * 60 * 60 * 24),
    );
    const daysUntilDue = Math.ceil((nextDueMs - now) / (1000 * 60 * 60 * 24));

    return { ...r, chapter, resource, isDue, daysSince, daysUntilDue };
  });

  const filtered = showDueOnly ? enriched.filter((r) => r.isDue) : enriched;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm">
          {showDueOnly ? "No revisions due right now." : "No reminders set."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((r) => (
        <div
          key={r.id}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            r.isDue
              ? "bg-amber-400/5 border-amber-400/30"
              : "bg-card border-border"
          }`}
        >
          <RotateCcw
            className={`w-4 h-4 shrink-0 ${r.isDue ? "text-amber-400" : "text-muted-foreground"}`}
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {r.chapter?.name || r.chapterId}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.resource?.name} · every {r.intervalDays.toString()}d
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {r.isDue ? (
              <Badge className="text-xs bg-amber-400/20 text-amber-400 border-amber-400/30 border font-mono">
                Due now
              </Badge>
            ) : (
              <span className="text-xs font-mono text-muted-foreground">
                in {r.daysUntilDue}d
              </span>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => markComplete.mutate(r.id)}
              disabled={markComplete.isPending}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-400"
              title="Mark as reviewed"
            >
              {markComplete.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteReminder.mutate(r.id)}
              disabled={deleteReminder.isPending}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
              title="Remove reminder"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

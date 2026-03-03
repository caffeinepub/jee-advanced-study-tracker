import { ChevronDown, ChevronRight } from "lucide-react";
import React, { useState } from "react";
import type { Chapter, Resource } from "../backend";
import { useGetAllChapters, useGetResources } from "../hooks/useQueries";

const SUBJECT_COLORS: Record<string, string> = {
  Physics: "text-sky-400",
  Chemistry: "text-violet-400",
  Maths: "text-amber-400",
};

const SUBJECT_BAR_COLORS: Record<string, string> = {
  Physics: "oklch(0.72 0.15 200)",
  Chemistry: "oklch(0.55 0.18 300)",
  Maths: "oklch(0.78 0.18 55)",
};

interface ResourceProgressProps {
  resource: Resource;
  chapters: Chapter[];
}

function ResourceProgress({ resource, chapters }: ResourceProgressProps) {
  const [expanded, setExpanded] = useState(false);
  const resourceChapters = chapters.filter((c) => c.resourceId === resource.id);
  const done = resourceChapters.filter((c) => c.status === "Done").length;
  const total = resourceChapters.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor =
    SUBJECT_BAR_COLORS[resource.subject] || "oklch(0.78 0.18 55)";

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left group"
      >
        <div className="flex items-center gap-1.5 mb-1">
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {resource.name}
          </span>
          <span className="text-xs font-mono text-muted-foreground shrink-0 ml-auto">
            {done}/{total}
          </span>
        </div>
        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden ml-4">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      </button>

      {expanded && resourceChapters.length > 0 && (
        <div className="ml-4 mt-2 space-y-0.5 max-h-32 overflow-y-auto">
          {resourceChapters.map((ch) => (
            <div key={ch.id} className="flex items-center gap-2 text-xs py-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  ch.status === "Done"
                    ? "bg-emerald-400"
                    : ch.status === "In Progress"
                      ? "bg-amber-400"
                      : "bg-muted-foreground/30"
                }`}
              />
              <span
                className={`truncate ${ch.status === "Done" ? "text-muted-foreground line-through" : "text-foreground/80"}`}
              >
                {ch.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GoalsTrackerBar() {
  const { data: resources = [] } = useGetResources();
  const { data: chapters = [] } = useGetAllChapters();

  const subjects = ["Physics", "Chemistry", "Maths"];

  return (
    <div className="bg-card/60 border-b border-border backdrop-blur-sm">
      <div className="px-4 py-2">
        <div className="flex items-start gap-1 mb-1.5">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider shrink-0 pt-0.5">
            Goals
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const subjectResources = resources.filter(
              (r) => r.subject === subject,
            );
            const subjectResourceIds = new Set(
              subjectResources.map((r) => r.id),
            );
            const subjectChapters = chapters.filter((c) =>
              subjectResourceIds.has(c.resourceId),
            );

            // Deduplicate by chapter name — same chapter in multiple resources counts once
            // "Done" only when Done in ALL resources that contain that chapter name
            const byName = new Map<string, typeof subjectChapters>();
            for (const ch of subjectChapters) {
              const existing = byName.get(ch.name) || [];
              existing.push(ch);
              byName.set(ch.name, existing);
            }
            const total = byName.size;
            let done = 0;
            for (const instances of byName.values()) {
              if (instances.every((c) => c.status === "Done")) done += 1;
            }

            return (
              <div key={subject}>
                <div
                  className={`text-xs font-semibold font-mono mb-2 ${SUBJECT_COLORS[subject]}`}
                >
                  {subject.toUpperCase()} — {done}/{total}
                </div>
                <div className="space-y-2">
                  {subjectResources.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No resources yet
                    </p>
                  ) : (
                    subjectResources.map((r) => (
                      <ResourceProgress
                        key={r.id}
                        resource={r}
                        chapters={chapters}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

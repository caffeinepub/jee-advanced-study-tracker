import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  ChevronRight,
  Clock,
  Lightbulb,
  RefreshCw,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useMemo, useState } from "react";
import {
  useGetAllChapters,
  useGetAllRevisionReminders,
  useGetDueForRevision,
  useGetResources,
  useGetTasks,
} from "../hooks/useQueries";
import { Link } from "../hooks/useRouter";
import {
  type TutorRecommendation,
  generateDailyPlan,
  generateRecommendations,
  getDaysToJEE,
} from "../utils/tutorEngine";

// ── Type colour maps ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  TutorRecommendation["type"],
  {
    borderColor: string;
    bgColor: string;
    badgeClass: string;
    icon: React.ElementType;
    label: string;
  }
> = {
  urgent: {
    borderColor: "border-l-red-500",
    bgColor: "bg-red-500/5",
    badgeClass: "bg-red-500/15 text-red-400 border border-red-500/30",
    icon: AlertTriangle,
    label: "Urgent",
  },
  focus: {
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-500/5",
    badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    icon: Zap,
    label: "Focus",
  },
  plan: {
    borderColor: "border-l-sky-500",
    bgColor: "bg-sky-500/5",
    badgeClass: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    icon: Target,
    label: "Plan",
  },
  insight: {
    borderColor: "border-l-violet-500",
    bgColor: "bg-violet-500/5",
    badgeClass: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
    icon: Lightbulb,
    label: "Insight",
  },
  motivation: {
    borderColor: "border-l-emerald-500",
    bgColor: "bg-emerald-500/5",
    badgeClass:
      "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    icon: TrendingUp,
    label: "Motivation",
  },
};

const SUBJECT_COLOUR: Record<string, string> = {
  Physics: "text-sky-400",
  Chemistry: "text-violet-400",
  Maths: "text-amber-400",
  General: "text-slate-400",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  index,
}: {
  rec: TutorRecommendation;
  index: number;
}) {
  const cfg = TYPE_CONFIG[rec.type];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      data-ocid={`tutor.item.${index + 1}`}
      className={`relative rounded-xl border border-border ${cfg.bgColor} border-l-4 ${cfg.borderColor} p-4 flex flex-col gap-3`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.badgeClass}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${cfg.badgeClass} select-none`}
            >
              {cfg.label}
            </span>
            {rec.subject && rec.subject !== "General" && (
              <span
                className={`text-[10px] font-mono uppercase tracking-widest select-none ${SUBJECT_COLOUR[rec.subject]}`}
              >
                {rec.subject}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug select-none">
            {rec.title}
          </h3>
        </div>
      </div>

      {/* Body */}
      <p className="text-xs text-muted-foreground leading-relaxed select-none pl-10">
        {rec.body}
      </p>

      {/* Action */}
      {rec.actionLabel && rec.actionPath && (
        <div className="pl-10">
          <Link
            to={rec.actionPath}
            data-ocid={`tutor.item.${index + 1}.link`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors group"
          >
            {rec.actionLabel}
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

function DailyPlanCard({
  chapters,
  resources,
  dueRevisions,
}: {
  chapters: import("../backend").Chapter[];
  resources: import("../backend").Resource[];
  dueRevisions: import("../backend").RevisionReminder[];
}) {
  const plan = useMemo(
    () => generateDailyPlan(chapters, resources, dueRevisions),
    [chapters, resources, dueRevisions],
  );

  const subjectColours: Record<string, string> = {
    Physics: "from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400",
    Chemistry:
      "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400",
    Maths:
      "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-ocid="tutor.plan.card"
      className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-primary shrink-0" />
        <h2 className="text-sm font-semibold text-foreground select-none">
          Today's Game Plan
        </h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-primary leading-none">
            {plan.totalDaysLeft}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1 select-none">
            Days Left
          </div>
        </div>
        <div className="text-center border-x border-border/60">
          <div className="text-2xl font-bold font-mono text-foreground leading-none">
            {plan.chaptersLeft}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1 select-none">
            Chapters Left
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-amber-400 leading-none">
            {plan.targetPerDay}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1 select-none">
            Per Day
          </div>
        </div>
      </div>

      {/* Per-subject focus */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 select-none">
          Subject focus today
        </p>
        {plan.todayFocus.map((item) => (
          <div
            key={item.subject}
            className={`flex items-center justify-between rounded-lg border bg-gradient-to-r px-3 py-2 ${subjectColours[item.subject] ?? ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold select-none">
                {item.subject}
              </span>
              <span className="text-[10px] text-muted-foreground select-none">
                — {item.reason}
              </span>
            </div>
            <span className="font-mono font-bold text-sm select-none">
              {item.count} ch
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TutorPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: chapters = [], isLoading: chaptersLoading } =
    useGetAllChapters();
  const { data: resources = [], isLoading: resourcesLoading } =
    useGetResources();
  const { data: dueRevisions = [], isLoading: dueLoading } =
    useGetDueForRevision();
  const { data: tasks = [], isLoading: tasksLoading } = useGetTasks();
  const { data: reminders = [], isLoading: remindersLoading } =
    useGetAllRevisionReminders();

  const isLoading =
    chaptersLoading ||
    resourcesLoading ||
    dueLoading ||
    tasksLoading ||
    remindersLoading;

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally triggers re-computation
  const recommendations = useMemo(() => {
    if (isLoading) return [];
    return generateRecommendations(
      chapters,
      resources,
      reminders,
      tasks,
      dueRevisions,
    );
  }, [
    chapters,
    resources,
    reminders,
    tasks,
    dueRevisions,
    isLoading,
    refreshKey,
  ]);

  const daysLeft = getDaysToJEE();
  const hasData = resources.length > 0 || chapters.length > 0;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5 select-none">
            <Brain className="w-6 h-6 text-primary" />
            AI Tutor
          </h1>
          <p className="text-xs text-muted-foreground mt-1 select-none">
            Rule-based analysis of your study data — refreshed every time you
            open this page.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* JEE countdown badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono text-primary font-semibold select-none">
              {daysLeft}d
            </span>
            <span className="text-xs font-mono text-muted-foreground select-none">
              to JEE
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="h-8 text-xs border-border"
            data-ocid="tutor.refresh.button"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Loading state ── */}
      {isLoading && (
        <div data-ocid="tutor.loading_state" className="space-y-4">
          {/* Plan card skeleton */}
          <div className="rounded-xl border border-border p-5 mb-6 space-y-4">
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-8 rounded-lg" />
            </div>
          </div>
          {/* Rec card skeletons */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
              key={i}
              className="rounded-xl border border-border p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* ── No data / empty state ── */}
      {!isLoading && !hasData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-ocid="tutor.empty_state"
          className="flex flex-col items-center justify-center gap-4 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1 select-none">
              Nothing to analyse yet
            </h2>
            <p className="text-xs text-muted-foreground max-w-xs select-none">
              Add resources and chapters in the Physics, Chemistry or Maths
              pages first. Then come back here for personalised recommendations.
            </p>
          </div>
          <Link
            to="/resources"
            data-ocid="tutor.empty_state.link"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Get started with Resources
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {/* ── Main content ── */}
      {!isLoading && hasData && (
        <>
          {/* Daily plan */}
          <DailyPlanCard
            chapters={chapters}
            resources={resources}
            dueRevisions={dueRevisions}
          />

          {/* Recommendations */}
          <div className="mb-4">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3 select-none flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Recommendations
              <span className="ml-auto text-primary font-bold">
                {recommendations.length}
              </span>
            </h2>

            <AnimatePresence mode="popLayout">
              {recommendations.length === 0 ? (
                <motion.div
                  key="no-recs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-border bg-card/50 p-6 text-center"
                  data-ocid="tutor.recommendations.empty_state"
                >
                  <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground mb-1 select-none">
                    All caught up!
                  </p>
                  <p className="text-xs text-muted-foreground select-none">
                    No urgent actions right now. Keep up the momentum.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <RecommendationCard
                      key={`${rec.id}-${refreshKey}`}
                      rec={rec}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer note */}
          <div className="mt-8 rounded-xl border border-border bg-card/30 p-4">
            <p className="text-[10px] text-muted-foreground leading-relaxed select-none">
              <span className="font-semibold text-foreground">
                How this works:
              </span>{" "}
              The tutor analyses your chapter statuses, revision due dates, and
              tasks in real time. It uses priority-weighted rules to surface the
              most important action first. Click{" "}
              <span className="font-semibold text-foreground">Refresh</span> at
              any time to re-run the analysis.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Loader2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Chapter, Resource, RevisionReminder } from "../backend";
import {
  useCreateTask,
  useGetAllChapters,
  useGetDueForRevision,
  useGetMyTodaySeconds,
  useGetResources,
  useGetTasks,
  useRecordStudyTime,
  useUpdateChapterQuestions,
  useUpdateChapterStatus,
} from "../hooks/useQueries";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import { Link } from "../hooks/useRouter";

// Deduplication helper — same logic as GoalsTrackerBar
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
  for (const instances of byName.values()) {
    if (instances.every((c) => c.status === "Done")) done += 1;
  }
  return { total, done, byName };
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Currently Doing Card ───────────────────────────────────────────────────────

function InlineQEditor({
  chapter,
  resourceId,
}: {
  chapter: Chapter;
  resourceId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [doneVal, setDoneVal] = useState(String(chapter.doneQuestions));
  const [totalVal, setTotalVal] = useState(String(chapter.totalQuestions));
  const updateQ = useUpdateChapterQuestions();

  const total = Number(chapter.totalQuestions);
  const done = Number(chapter.doneQuestions);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDoneVal(String(chapter.doneQuestions));
          setTotalVal(String(chapter.totalQuestions));
          setEditing(true);
        }}
        className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors shrink-0 ${
          total === 0
            ? "opacity-50 bg-muted/20 text-muted-foreground border-border hover:opacity-100"
            : pct >= 100
              ? "bg-emerald-400/15 text-emerald-400 border-emerald-400/30"
              : pct > 0
                ? "bg-amber-400/15 text-amber-400 border-amber-400/30"
                : "bg-muted/30 text-muted-foreground border-border"
        }`}
        title="Click to edit Q count"
      >
        {total === 0 ? "Set Q" : `${done}/${total}Q`}
      </button>
    );
  }

  const handleSave = () => {
    updateQ.mutate({
      chapterId: chapter.id,
      doneQuestions: BigInt(Number.parseInt(doneVal) || 0),
      totalQuestions: BigInt(Number.parseInt(totalVal) || 0),
      resourceId,
    });
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Input
        value={doneVal}
        onChange={(e) => setDoneVal(e.target.value)}
        className="h-6 w-12 text-xs bg-input border-border text-center p-1"
        placeholder="done"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <span className="text-muted-foreground text-xs">/</span>
      <Input
        value={totalVal}
        onChange={(e) => setTotalVal(e.target.value)}
        className="h-6 w-12 text-xs bg-input border-border text-center p-1"
        placeholder="total"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button
        size="sm"
        className="h-6 px-2 text-xs bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/30"
        disabled={updateQ.isPending}
        onClick={handleSave}
      >
        {updateQ.isPending ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
        ) : (
          "✓"
        )}
      </Button>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-xs"
        onClick={() => setEditing(false)}
      >
        ✕
      </button>
    </div>
  );
}

function CurrentlyDoingCard({
  chapters,
  resources,
}: {
  chapters: Chapter[];
  resources: Resource[];
}) {
  const updateStatus = useUpdateChapterStatus();
  const currentlyDoing = chapters.filter((c) => c.status === "Currently Doing");

  if (currentlyDoing.length === 0) return null;

  // Group by resource name
  const grouped = new Map<
    string,
    { resource: Resource; chapters: Chapter[] }
  >();
  for (const ch of currentlyDoing) {
    const res = resources.find((r) => r.id === ch.resourceId);
    if (!res) continue;
    const existing = grouped.get(res.id) || { resource: res, chapters: [] };
    existing.chapters.push(ch);
    grouped.set(res.id, existing);
  }

  const STATUS_OPTIONS = [
    "Currently Doing",
    "In Progress",
    "Not Started",
    "Done",
  ];

  return (
    <div
      className="bg-card border border-cyan-400/30 rounded-lg p-4"
      data-ocid="dashboard.currently-doing.card"
    >
      <h2 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
        <Play className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
        Currently Doing
        <span className="text-xs font-mono text-muted-foreground ml-auto">
          {currentlyDoing.length} active
        </span>
      </h2>
      <div className="space-y-2">
        {Array.from(grouped.values()).map(({ resource, chapters: rChapters }) =>
          rChapters.map((chapter) => (
            <div
              key={chapter.id}
              className="flex items-center gap-3 p-2.5 rounded-md bg-cyan-400/5 border border-cyan-400/15"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {chapter.name}
                </p>
                <p className="text-xs text-muted-foreground">{resource.name}</p>
              </div>
              <InlineQEditor chapter={chapter} resourceId={resource.id} />
              <Select
                value={chapter.status}
                onValueChange={(val) =>
                  updateStatus.mutate({
                    chapterId: chapter.id,
                    status: val,
                    resourceId: resource.id,
                  })
                }
              >
                <SelectTrigger className="h-7 w-36 text-xs border bg-cyan-400/15 text-cyan-400 border-cyan-400/30 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )),
        )}
      </div>
    </div>
  );
}

// ── Quick Add Task Card ────────────────────────────────────────────────────────

function QuickAddTaskCard() {
  const [title, setTitle] = useState("");
  const [subjectTag, setSubjectTag] = useState("General");
  const createTask = useCreateTask();

  const handleAdd = async () => {
    if (!title.trim()) return;
    const todayStr = getTodayStr();
    const dueDateBigInt =
      BigInt(new Date(todayStr).getTime()) * BigInt(1_000_000);
    await createTask.mutateAsync({
      title: title.trim(),
      description: "",
      subjectTag,
      dueDate: dueDateBigInt,
    });
    setTitle("");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Plus className="w-4 h-4 text-sky-400" />
        Quick Add Task
      </h2>
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          className="flex-1 h-8 text-xs bg-input border-border"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          data-ocid="dashboard.quick-add-task.input"
        />
        <Select value={subjectTag} onValueChange={setSubjectTag}>
          <SelectTrigger
            className="h-8 w-28 text-xs bg-input border-border shrink-0"
            data-ocid="dashboard.quick-add-task.select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Physics", "Chemistry", "Maths", "General"].map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!title.trim() || createTask.isPending}
          className="h-8 px-3 bg-primary text-primary-foreground text-xs shrink-0"
          data-ocid="dashboard.quick-add-task.submit_button"
        >
          {createTask.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            "Add"
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        Added with today's date automatically
      </p>
    </div>
  );
}

// ── Mini Timer Widget ─────────────────────────────────────────────────────────

function MiniTimerWidget() {
  const { data: todaySeconds = BigInt(0) } = useGetMyTodaySeconds();
  const recordStudyTime = useRecordStudyTime();

  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStop = () => {
    setIsRunning(false);
    if (elapsed > 0) {
      recordStudyTime.mutate(BigInt(elapsed));
      setElapsed(0);
    }
  };

  const totalToday = Number(todaySeconds) + (isRunning ? elapsed : 0);

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Timer className="w-4 h-4 text-emerald-400" />
          Timer
        </h2>
        <Link
          to="/timer"
          className="text-xs text-primary hover:underline font-mono"
          data-ocid="dashboard.timer.link"
        >
          Full timer →
        </Link>
      </div>

      {/* Today's total */}
      <div className="text-center py-2">
        <p className="text-xs text-muted-foreground font-mono mb-1">
          Today's Study Time
        </p>
        <p className="text-2xl font-bold font-mono text-emerald-400">
          {formatSeconds(totalToday)}
        </p>
        {isRunning && (
          <p className="text-xs text-muted-foreground font-mono mt-1">
            +{formatSeconds(elapsed)} this session
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!isRunning ? (
          <Button
            size="sm"
            onClick={() => setIsRunning(true)}
            className="flex-1 h-8 text-xs bg-emerald-400/15 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/25"
            data-ocid="dashboard.timer.primary_button"
          >
            <Play className="w-3 h-3 mr-1.5 fill-emerald-400" />
            Start
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleStop}
            className="flex-1 h-8 text-xs bg-red-400/15 text-red-400 border border-red-400/30 hover:bg-red-400/25"
            data-ocid="dashboard.timer.secondary_button"
          >
            <Pause className="w-3 h-3 mr-1.5" />
            Stop & Save
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Full Day Planner on Dashboard ─────────────────────────────────────────────
// Mirrors PlannerPage logic but embedded in dashboard (today only, no month nav)

type SubjectType = "physics" | "chemistry" | "maths" | "mock" | "general";

interface PlannerEvent {
  id: string;
  date: string;
  title: string;
  subject: SubjectType;
  startMinutes: number;
  endMinutes: number;
  notes?: string;
}

const PLANNER_STORAGE_KEY = "jee_planner_events";
const DAY_START = 0;
const DAY_END = 24 * 60;
const SLOT_HEIGHT = 20;
const TOTAL_SLOTS = DAY_END / 15;
const HEADER_HEIGHT = 44;

const SUBJECT_CFG: Record<
  SubjectType,
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  physics: {
    label: "Physics",
    bg: "bg-sky-400/20",
    border: "border-sky-400/50",
    text: "text-sky-300",
    dot: "bg-sky-400",
  },
  chemistry: {
    label: "Chemistry",
    bg: "bg-violet-400/20",
    border: "border-violet-400/50",
    text: "text-violet-300",
    dot: "bg-violet-400",
  },
  maths: {
    label: "Maths",
    bg: "bg-amber-400/20",
    border: "border-amber-400/50",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
  mock: {
    label: "Mock",
    bg: "bg-rose-400/20",
    border: "border-rose-400/50",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
  general: {
    label: "General",
    bg: "bg-slate-400/20",
    border: "border-slate-400/50",
    text: "text-slate-300",
    dot: "bg-slate-400",
  },
};

function minToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function loadPlannerEvents(): PlannerEvent[] {
  try {
    return JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function savePlannerEvents(evs: PlannerEvent[]) {
  localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(evs));
}
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface LayoutSlot {
  event: PlannerEvent;
  left: number;
  width: number;
}
function computeLayout(events: PlannerEvent[]): LayoutSlot[] {
  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes);
  const slots: LayoutSlot[] = sorted.map((e) => ({
    event: e,
    left: 0,
    width: 1,
  }));
  const columns: PlannerEvent[][] = [];
  for (const ev of sorted) {
    let placed = false;
    for (const col of columns) {
      if (col[col.length - 1].endMinutes <= ev.startMinutes) {
        col.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) columns.push([ev]);
  }
  const totalCols = columns.length;
  for (let c = 0; c < columns.length; c++) {
    for (const ev of columns[c]) {
      let span = 1;
      for (let c2 = c + 1; c2 < columns.length; c2++) {
        if (
          !columns[c2].some(
            (e2) =>
              e2.startMinutes < ev.endMinutes &&
              e2.endMinutes > ev.startMinutes,
          )
        )
          span++;
        else break;
      }
      const idx = slots.findIndex((s) => s.event.id === ev.id);
      if (idx !== -1) {
        slots[idx].left = c / totalCols;
        slots[idx].width = span / totalCols;
      }
    }
  }
  return slots;
}

// Inline add-block dialog state type
interface AddBlockState {
  open: boolean;
  startMinutes: number;
  title: string;
  subject: SubjectType;
  endMinutes: number;
}

function DashboardDayPlanner() {
  const todayStr = getTodayStr();
  const [events, setEvents] = useState<PlannerEvent[]>(() =>
    loadPlannerEvents(),
  );
  const [dragging, setDragging] = useState<PlannerEvent | null>(null);
  const [dropSlot, setDropSlot] = useState<number | null>(null);
  const [addState, setAddState] = useState<AddBlockState>({
    open: false,
    startMinutes: 9 * 60,
    title: "",
    subject: "general",
    endMinutes: 10 * 60,
  });
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    savePlannerEvents(events);
  }, [events]);

  const todayEvents = events.filter((e) => e.date === todayStr);
  const layoutSlots = computeLayout(todayEvents);
  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT;

  const getSlot = useCallback((y: number): number => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const relY = y - rect.top;
    const idx = Math.floor(relY / SLOT_HEIGHT);
    return DAY_START + Math.max(0, Math.min(idx, TOTAL_SLOTS - 1)) * 15;
  }, []);

  const handleGridClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-planner-event]")) return;
    const start = getSlot(e.clientY);
    setAddState({
      open: true,
      startMinutes: start,
      endMinutes: Math.min(start + 60, DAY_END),
      title: "",
      subject: "general",
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDropSlot(getSlot(e.clientY));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragging) return;
    const newStart = getSlot(e.clientY);
    const dur = dragging.endMinutes - dragging.startMinutes;
    const clampedStart = Math.max(DAY_START, Math.min(newStart, DAY_END - 15));
    const newEnd = Math.min(clampedStart + dur, DAY_END);
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === dragging.id
          ? { ...ev, startMinutes: clampedStart, endMinutes: newEnd }
          : ev,
      ),
    );
    setDragging(null);
    setDropSlot(null);
  };

  const handleAddConfirm = () => {
    if (!addState.title.trim()) return;
    const newEv: PlannerEvent = {
      id: genId(),
      date: todayStr,
      title: addState.title.trim(),
      subject: addState.subject,
      startMinutes: addState.startMinutes,
      endMinutes: addState.endMinutes,
    };
    setEvents((prev) => [...prev, newEv]);
    setAddState((s) => ({ ...s, open: false, title: "" }));
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const hourLabels: number[] = [];
  for (let m = 0; m <= DAY_END; m += 60) hourLabels.push(m);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-violet-400" />
          Today's Planner
          <span className="text-xs font-mono text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {todayEvents.length > 0 && (
            <span className="text-xs font-mono text-muted-foreground">
              {todayEvents.length} block{todayEvents.length !== 1 ? "s" : ""}
            </span>
          )}
          <Link
            to="/planner"
            className="text-xs text-primary hover:underline font-mono"
            data-ocid="dashboard.planner.link"
          >
            Full planner →
          </Link>
        </div>
      </div>

      {/* Inline add form (appears when clicking a slot) */}
      {addState.open && (
        <div className="border-b border-border/60 bg-muted/10 px-4 py-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              Title
            </span>
            <Input
              value={addState.title}
              onChange={(e) =>
                setAddState((s) => ({ ...s, title: e.target.value }))
              }
              placeholder="Block title..."
              className="h-7 w-40 text-xs bg-input border-border"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddConfirm();
                if (e.key === "Escape")
                  setAddState((s) => ({ ...s, open: false }));
              }}
              data-ocid="dashboard.planner.input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              Subject
            </span>
            <Select
              value={addState.subject}
              onValueChange={(v) =>
                setAddState((s) => ({ ...s, subject: v as SubjectType }))
              }
            >
              <SelectTrigger
                className="h-7 w-28 text-xs bg-input border-border"
                data-ocid="dashboard.planner.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(SUBJECT_CFG) as [
                    SubjectType,
                    (typeof SUBJECT_CFG)[SubjectType],
                  ][]
                ).map(([k, c]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              Start
            </span>
            <Select
              value={String(addState.startMinutes)}
              onValueChange={(v) =>
                setAddState((s) => ({ ...s, startMinutes: Number(v) }))
              }
            >
              <SelectTrigger className="h-7 w-20 text-xs bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-40">
                {Array.from({ length: TOTAL_SLOTS }, (_, i) => i * 15).map(
                  (m) => (
                    <SelectItem
                      key={m}
                      value={String(m)}
                      className="text-xs font-mono"
                    >
                      {minToTime(m)}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              End
            </span>
            <Select
              value={String(addState.endMinutes)}
              onValueChange={(v) =>
                setAddState((s) => ({ ...s, endMinutes: Number(v) }))
              }
            >
              <SelectTrigger className="h-7 w-20 text-xs bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-40">
                {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => i * 15)
                  .filter((m) => m > addState.startMinutes)
                  .map((m) => (
                    <SelectItem
                      key={m}
                      value={String(m)}
                      className="text-xs font-mono"
                    >
                      {m === DAY_END ? "24:00" : minToTime(m)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={handleAddConfirm}
            disabled={!addState.title.trim()}
            className="h-7 px-3 text-xs bg-primary text-primary-foreground"
            data-ocid="dashboard.planner.submit_button"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
          <button
            type="button"
            onClick={() => setAddState((s) => ({ ...s, open: false }))}
            className="text-muted-foreground hover:text-foreground text-xs px-2 h-7"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Day grid */}
      <div className="flex" style={{ overflowX: "auto" }}>
        {/* Time axis */}
        <div className="shrink-0 w-12 flex flex-col border-r border-border/30">
          <div
            style={{ height: `${HEADER_HEIGHT}px`, flexShrink: 0 }}
            className="border-b border-border/60"
          />
          <div className="relative" style={{ height: `${totalHeight}px` }}>
            {hourLabels.map((m) => (
              <div
                key={m}
                className="absolute right-1 text-[9px] font-mono text-muted-foreground/70 -translate-y-1/2 leading-none"
                style={{ top: `${(m / 15) * SLOT_HEIGHT}px` }}
              >
                {m === DAY_END ? "24:00" : minToTime(m)}
              </div>
            ))}
          </div>
        </div>

        {/* Column */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Column header */}
          <div
            className="sticky top-0 z-20 flex flex-col items-center justify-center border-b border-border/60 bg-card"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              {new Date().toLocaleDateString("en-IN", { weekday: "short" })}
            </span>
            <span className="text-sm font-bold text-primary">
              {new Date().getDate()}
            </span>
          </div>

          {/* Grid */}
          <div
            ref={gridRef}
            role="presentation"
            className="relative cursor-pointer"
            style={{ height: `${totalHeight}px` }}
            onClick={handleGridClick}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              handleGridClick(e as unknown as React.MouseEvent)
            }
            onDragOver={handleDragOver}
            onDragLeave={() => setDropSlot(null)}
            onDrop={handleDrop}
            data-ocid="dashboard.planner.canvas_target"
          >
            {/* Hour lines */}
            {hourLabels.map((m) => (
              <div
                key={m}
                className="absolute left-0 right-0 border-t border-border/25 pointer-events-none"
                style={{ top: `${(m / 15) * SLOT_HEIGHT}px` }}
              />
            ))}

            {/* 15-min slots */}
            {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
              const sm = i * 15;
              const isDropTarget = dropSlot !== null && sm === dropSlot;
              return (
                <div
                  key={sm}
                  className={`absolute left-0 right-0 pointer-events-none transition-colors ${isDropTarget ? "bg-primary/20 border-t-2 border-primary/70" : ""}`}
                  style={{
                    top: `${i * SLOT_HEIGHT}px`,
                    height: `${SLOT_HEIGHT}px`,
                  }}
                />
              );
            })}

            {/* Drag ghost */}
            {dragging && dropSlot !== null && (
              <div
                className="absolute left-1 right-1 rounded-md border border-dashed border-primary/70 bg-primary/15 pointer-events-none z-20"
                style={{
                  top: `${(dropSlot / 15) * SLOT_HEIGHT}px`,
                  height: `${Math.max(((dragging.endMinutes - dragging.startMinutes) / 15) * SLOT_HEIGHT, SLOT_HEIGHT)}px`,
                }}
              />
            )}

            {/* Events */}
            {layoutSlots.map(({ event, left, width }) => {
              const cfg = SUBJECT_CFG[event.subject];
              const topPx = (event.startMinutes / 15) * SLOT_HEIGHT;
              const heightPx = Math.max(
                ((event.endMinutes - event.startMinutes) / 15) * SLOT_HEIGHT,
                SLOT_HEIGHT,
              );
              return (
                <div
                  key={event.id}
                  data-planner-event="1"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(event);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setDropSlot(null);
                  }}
                  style={{
                    top: `${topPx}px`,
                    height: `${heightPx}px`,
                    left: `calc(${left * 100}% + 2px)`,
                    width: `calc(${width * 100}% - 4px)`,
                    zIndex: 10,
                  }}
                  className={`absolute rounded-md border px-1.5 py-0.5 overflow-hidden group select-none ${cfg.bg} ${cfg.border} ${cfg.text} hover:brightness-110`}
                >
                  <p className="text-[11px] font-semibold leading-tight truncate">
                    {event.title}
                  </p>
                  {heightPx > SLOT_HEIGHT * 1.5 && (
                    <p className="text-[9px] opacity-70 leading-tight font-mono">
                      {minToTime(event.startMinutes)}–
                      {minToTime(event.endMinutes)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(event.id);
                    }}
                    className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-70 hover:!opacity-100 text-current"
                    data-ocid="dashboard.planner.delete_button"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-border/40 bg-muted/10">
        <p className="text-[10px] text-muted-foreground font-mono">
          Click any slot to add a block · Drag to move · Hover a block to delete
        </p>
      </div>
    </div>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: profile } = useGetCallerUserProfile();
  const { data: chapters = [], isLoading: chaptersLoading } =
    useGetAllChapters();
  const { data: dueRevisions = [] } = useGetDueForRevision();
  const { data: tasks = [] } = useGetTasks();
  const { data: resources = [] } = useGetResources();

  const subjects = ["Physics", "Chemistry", "Maths"] as const;

  // Deduplicated totals (same logic as GoalsTrackerBar)
  let deduplicatedTotal = 0;
  let deduplicatedDone = 0;
  for (const subject of subjects) {
    const { total, done } = deduplicateSubjectChapters(
      subject,
      resources,
      chapters,
    );
    deduplicatedTotal += total;
    deduplicatedDone += done;
  }

  const pendingTasks = tasks.filter((t) => t.status !== "Done").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {profile ? `Welcome back, ${profile.name}` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-mono">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Quick Add Task + Timer side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickAddTaskCard />
        <MiniTimerWidget />
      </div>

      {/* Full Day Planner */}
      <DashboardDayPlanner />

      {/* Currently Doing — only shows if chapters have that status */}
      <CurrentlyDoingCard chapters={chapters} resources={resources} />

      {/* Due for Revision — full width */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Due for Revision
          </h2>
          <Link
            to="/revision"
            className="text-xs text-primary hover:underline font-mono"
            data-ocid="dashboard.revision.link"
          >
            View all →
          </Link>
        </div>
        {dueRevisions.length === 0 ? (
          <div
            className="text-center py-6 text-muted-foreground text-sm"
            data-ocid="dashboard.revision.empty_state"
          >
            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No revisions due today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dueRevisions.slice(0, 5).map((r) => (
              <DueRevisionItem
                key={r.id}
                reminder={r}
                chapters={chapters}
                resources={resources}
              />
            ))}
            {dueRevisions.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{dueRevisions.length - 5} more
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats — bottom row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {chaptersLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Chapters"
              value={deduplicatedTotal}
              icon={<BookOpen className="w-4 h-4" />}
              color="text-foreground"
            />
            <StatCard
              label="Completed"
              value={deduplicatedDone}
              icon={<TrendingUp className="w-4 h-4" />}
              color="text-emerald-400"
            />
            <StatCard
              label="Due Revisions"
              value={dueRevisions.length}
              icon={<RotateCcw className="w-4 h-4" />}
              color={
                dueRevisions.length > 0
                  ? "text-amber-400"
                  : "text-muted-foreground"
              }
            />
            <StatCard
              label="Pending Tasks"
              value={pendingTasks}
              icon={<CheckSquare className="w-4 h-4" />}
              color={
                pendingTasks > 0 ? "text-sky-400" : "text-muted-foreground"
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          {label}
        </span>
        <span className={color}>{icon}</span>
      </div>
      <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}

function DueRevisionItem({
  reminder,
  chapters,
  resources,
}: {
  reminder: RevisionReminder;
  chapters: Chapter[];
  resources: Resource[];
}) {
  const chapter = chapters.find((c) => c.id === reminder.chapterId);
  const resource = resources.find((r) => r.id === reminder.resourceId);
  const daysSince = Math.floor(
    (Date.now() - Number(reminder.lastReviewed) / 1_000_000) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-amber-400/5 border border-amber-400/20">
      <RotateCcw className="w-3 h-3 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">
          {chapter?.name || reminder.chapterId}
        </p>
        <p className="text-xs text-muted-foreground">{resource?.name}</p>
      </div>
      <span className="text-xs font-mono text-amber-400 shrink-0">
        {daysSince}d ago
      </span>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SubjectType = "physics" | "chemistry" | "maths" | "mock" | "general";

interface PlannerEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  subject: SubjectType;
  startMinutes: number;
  endMinutes: number;
  notes?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "jee_planner_events";
const DAY_START = 0; // 00:00
const DAY_END = 24 * 60; // 24:00 (1440)
const SLOT_HEIGHT = 20; // px per 15 minutes
const TOTAL_SLOTS = (DAY_END - DAY_START) / 15; // 96 slots

const SUBJECT_CONFIG: Record<
  SubjectType,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
    ghostBg: string;
  }
> = {
  physics: {
    label: "Physics",
    bg: "bg-sky-400/20",
    border: "border-sky-400/50",
    text: "text-sky-300",
    dot: "bg-sky-400",
    ghostBg: "bg-sky-400/6",
  },
  chemistry: {
    label: "Chemistry",
    bg: "bg-violet-400/20",
    border: "border-violet-400/50",
    text: "text-violet-300",
    dot: "bg-violet-400",
    ghostBg: "bg-violet-400/6",
  },
  maths: {
    label: "Maths",
    bg: "bg-amber-400/20",
    border: "border-amber-400/50",
    text: "text-amber-300",
    dot: "bg-amber-400",
    ghostBg: "bg-amber-400/6",
  },
  mock: {
    label: "Mock",
    bg: "bg-rose-400/20",
    border: "border-rose-400/50",
    text: "text-rose-300",
    dot: "bg-rose-400",
    ghostBg: "bg-rose-400/6",
  },
  general: {
    label: "General",
    bg: "bg-slate-400/20",
    border: "border-slate-400/50",
    text: "text-slate-300",
    dot: "bg-slate-400",
    ghostBg: "bg-slate-400/6",
  },
};

// Demo/template ghost blocks — shown as lighter placeholders
const GHOST_TEMPLATES: Array<{
  subject: SubjectType;
  startMinutes: number;
  endMinutes: number;
  label: string;
}> = [
  {
    subject: "physics",
    startMinutes: 6 * 60,
    endMinutes: 8 * 60,
    label: "Morning Physics",
  },
  {
    subject: "chemistry",
    startMinutes: 9 * 60,
    endMinutes: 11 * 60,
    label: "Chemistry Review",
  },
  {
    subject: "maths",
    startMinutes: 14 * 60,
    endMinutes: 16 * 60,
    label: "Maths Practice",
  },
  {
    subject: "mock",
    startMinutes: 17 * 60,
    endMinutes: 20 * 60,
    label: "Mock Test",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr(): string {
  return toDateStr(new Date());
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateTimeOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 15) {
    options.push({
      value: m,
      label: m === DAY_END ? "24:00" : minutesToTime(m),
    });
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// ── Overlap layout calculation ─────────────────────────────────────────────────
// Returns for each event: { left: 0..1, width: 0..1 }

interface LayoutSlot {
  event: PlannerEvent;
  left: number;
  width: number;
}

function computeOverlapLayout(events: PlannerEvent[]): LayoutSlot[] {
  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes);
  const slots: LayoutSlot[] = sorted.map((e) => ({
    event: e,
    left: 0,
    width: 1,
  }));

  // Group overlapping events into columns
  const columns: PlannerEvent[][] = [];

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      const lastInCol = col[col.length - 1];
      if (lastInCol.endMinutes <= ev.startMinutes) {
        col.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([ev]);
    }
  }

  const totalCols = columns.length;

  for (let c = 0; c < columns.length; c++) {
    for (const ev of columns[c]) {
      // How many columns does this event overlap with?
      let span = 1;
      for (let c2 = c + 1; c2 < columns.length; c2++) {
        const overlaps = columns[c2].some(
          (e2) =>
            e2.startMinutes < ev.endMinutes && e2.endMinutes > ev.startMinutes,
        );
        if (!overlaps) {
          span++;
        } else {
          break;
        }
      }
      const slotIdx = slots.findIndex((s) => s.event.id === ev.id);
      if (slotIdx !== -1) {
        slots[slotIdx].left = c / totalCols;
        slots[slotIdx].width = span / totalCols;
      }
    }
  }

  return slots;
}

// ── Local Storage ─────────────────────────────────────────────────────────────

function loadEvents(): PlannerEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PlannerEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: PlannerEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

// ── Month Calendar ─────────────────────────────────────────────────────────────

interface MonthCalendarProps {
  year: number;
  month: number;
  selectedDate: string;
  multiDayStart: string;
  multiDayCount: number;
  events: PlannerEvent[];
  dragOverDate: string | null;
  onSelectDate: (date: string) => void;
  onDragOver: (date: string | null) => void;
  onDropEvent: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function MonthCalendar({
  year,
  month,
  selectedDate,
  multiDayStart,
  multiDayCount,
  events,
  dragOverDate,
  onSelectDate,
  onDragOver,
  onDropEvent,
  onPrevMonth,
  onNextMonth,
}: MonthCalendarProps) {
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();

  const eventsByDate: Record<string, number> = {};
  for (const ev of events) {
    if (ev.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)) {
      eventsByDate[ev.date] = (eventsByDate[ev.date] || 0) + 1;
    }
  }

  // Build multi-day range set
  const multiDayDates = new Set<string>();
  for (let i = 0; i < multiDayCount; i++) {
    multiDayDates.add(addDays(multiDayStart, i));
  }

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(dateStr);
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    onDropEvent(dateStr);
    onDragOver(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="planner.calendar.pagination_prev"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-semibold text-foreground">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          type="button"
          onClick={onNextMonth}
          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="planner.calendar.pagination_next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="text-center py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-col-${idx % 7}-row-${Math.floor(idx / 7)}`}
                className="h-12 border-b border-r border-border/40 last:border-r-0"
              />
            );
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isInRange = multiDayDates.has(dateStr) && multiDayCount > 1;
          const isDragOver = dateStr === dragOverDate;
          const count = eventsByDate[dateStr] || 0;
          const colIdx = idx % 7;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              onDragOver={(e) => handleDragOver(e, dateStr)}
              onDrop={(e) => handleDrop(e, dateStr)}
              onDragLeave={() => onDragOver(null)}
              className={`
                relative h-12 flex flex-col items-center justify-center gap-0.5
                border-b border-r border-border/40 transition-all
                ${colIdx === 6 ? "border-r-0" : ""}
                ${isSelected ? "bg-primary/15" : isInRange ? "bg-primary/8" : isDragOver ? "bg-primary/10" : "hover:bg-muted/40"}
                ${isDragOver ? "ring-1 ring-inset ring-primary/50" : ""}
                ${isInRange && !isSelected ? "border-b border-primary/20" : ""}
              `}
              data-ocid={`planner.calendar.item.${day}`}
            >
              <span
                className={`
                  text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? "bg-primary text-primary-foreground font-bold" : isSelected ? "text-primary font-bold" : isInRange ? "text-primary/70" : "text-foreground"}
                `}
              >
                {day}
              </span>
              {count > 0 && (
                <div className="flex gap-0.5">
                  {count >= 1 && (
                    <span className="w-1 h-1 rounded-full bg-primary/70" />
                  )}
                  {count >= 2 && (
                    <span className="w-1 h-1 rounded-full bg-primary/70" />
                  )}
                  {count >= 3 && (
                    <span className="w-1 h-1 rounded-full bg-primary/70" />
                  )}
                  {count > 3 && (
                    <span className="text-[8px] text-primary/70 leading-none">
                      +{count - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Event Block ────────────────────────────────────────────────────────────────

interface EventBlockProps {
  event: PlannerEvent;
  left: number; // 0..1 fraction
  width: number; // 0..1 fraction
  onEdit: (event: PlannerEvent) => void;
  onDragStart: (event: PlannerEvent) => void;
  onTouchDragStart: (event: PlannerEvent, touch: React.Touch) => void;
}

function EventBlock({
  event,
  left,
  width,
  onEdit,
  onDragStart,
  onTouchDragStart,
}: EventBlockProps) {
  const cfg = SUBJECT_CONFIG[event.subject];
  const topPx = ((event.startMinutes - DAY_START) / 15) * SLOT_HEIGHT;
  const heightPx = Math.max(
    ((event.endMinutes - event.startMinutes) / 15) * SLOT_HEIGHT,
    SLOT_HEIGHT,
  );

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    onDragStart(event);
  };

  const touchMoveStarted = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchMoveStarted.current = false;
    onTouchDragStart(event, e.touches[0]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchMoveStarted.current = true;
    // Prevent page scroll while dragging a block
    e.stopPropagation();
  };

  const handleClick = () => {
    // Don't open edit dialog if user was touch-dragging
    if (!touchMoveStarted.current) {
      onEdit(event);
    }
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && onEdit(event)}
      style={{
        top: `${topPx}px`,
        height: `${heightPx}px`,
        left: `calc(${left * 100}% + 2px)`,
        width: `calc(${width * 100}% - 4px)`,
        zIndex: 10,
        touchAction: "none",
      }}
      className={`
        absolute rounded-md border px-1.5 py-0.5 overflow-hidden
        ${cfg.bg} ${cfg.border} ${cfg.text}
        hover:brightness-110 active:scale-[0.98]
        transition-all select-none
      `}
      data-ocid="planner.event.card"
    >
      <p className="text-[11px] font-semibold leading-tight truncate">
        {event.title}
      </p>
      {heightPx > SLOT_HEIGHT * 1.5 && (
        <p className="text-[9px] opacity-70 leading-tight font-mono">
          {minutesToTime(event.startMinutes)}–{minutesToTime(event.endMinutes)}
        </p>
      )}
    </button>
  );
}

// ── Ghost template block ───────────────────────────────────────────────────────

function GhostTemplateBlock({
  subject,
  startMinutes,
  endMinutes,
  label,
}: {
  subject: SubjectType;
  startMinutes: number;
  endMinutes: number;
  label: string;
}) {
  const cfg = SUBJECT_CONFIG[subject];
  const topPx = ((startMinutes - DAY_START) / 15) * SLOT_HEIGHT;
  const heightPx = Math.max(
    ((endMinutes - startMinutes) / 15) * SLOT_HEIGHT,
    SLOT_HEIGHT,
  );

  return (
    <div
      style={{ top: `${topPx}px`, height: `${heightPx}px`, zIndex: 2 }}
      className={`absolute left-1 right-1 rounded-md border border-dashed px-1.5 py-0.5 pointer-events-none opacity-40 ${cfg.ghostBg} ${cfg.border}`}
    >
      <p
        className={`text-[10px] font-medium leading-tight truncate ${cfg.text} opacity-60`}
      >
        {label}
      </p>
    </div>
  );
}

// ── Day Column ─────────────────────────────────────────────────────────────────

interface DayColumnProps {
  date: string;
  events: PlannerEvent[];
  draggingEvent: PlannerEvent | null;
  dropHighlightSlot: number | null; // minutes
  showGhosts: boolean;
  onCreateBlock: (date: string, startMinutes: number) => void;
  onEditEvent: (event: PlannerEvent) => void;
  onDragStart: (event: PlannerEvent) => void;
  onDragOver: (date: string, slot: number) => void;
  onDragLeave: () => void;
  onDrop: (date: string, startMinutes: number) => void;
  onTouchDragStart: (event: PlannerEvent, touch: React.Touch) => void;
  showTimeAxis: boolean;
}

function DayColumn({
  date,
  events,
  draggingEvent,
  dropHighlightSlot,
  showGhosts,
  onCreateBlock,
  onEditEvent,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onTouchDragStart,
  showTimeAxis,
}: DayColumnProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT;
  const today = todayStr();
  const isToday = date === today;

  const dateObj = new Date(`${date}T00:00:00`);
  const dayShort = dateObj.toLocaleDateString("en-IN", { weekday: "short" });
  const dayNum = dateObj.getDate();
  const monthShort = dateObj.toLocaleDateString("en-IN", { month: "short" });

  const dayEvents = events.filter((e) => e.date === date);
  const layoutSlots = computeOverlapLayout(dayEvents);

  const getSlotFromY = useCallback((y: number): number => {
    if (!gridRef.current) return DAY_START;
    const rect = gridRef.current.getBoundingClientRect();
    const relY = y - rect.top;
    const slotIndex = Math.floor(relY / SLOT_HEIGHT);
    const clamped = Math.max(0, Math.min(slotIndex, TOTAL_SLOTS - 1));
    return DAY_START + clamped * 15;
  }, []);

  const handleGridClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-ocid='planner.event.card']"))
      return;
    const startMinutes = getSlotFromY(e.clientY);
    onCreateBlock(date, startMinutes);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const slot = getSlotFromY(e.clientY);
    onDragOver(date, slot);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const startMinutes = getSlotFromY(e.clientY);
    onDrop(date, startMinutes);
  };

  // Touch drag: non-passive touchmove so we can call preventDefault and prevent scroll
  useEffect(() => {
    const el = gridRef.current;
    if (!el || !draggingEvent) return;
    const handler = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const slot = getSlotFromY(touch.clientY);
      onDragOver(date, slot);
    };
    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, [draggingEvent, date, getSlotFromY, onDragOver]);

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggingEvent) return;
    const touch = e.changedTouches[0];
    const startMinutes = getSlotFromY(touch.clientY);
    onDrop(date, startMinutes);
  };

  const hourLabels: { minutes: number; label: string }[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) {
    hourLabels.push({
      minutes: m,
      label: m === DAY_END ? "24:00" : minutesToTime(m),
    });
  }

  // The day header is ~52px tall. The time axis must have an equivalent spacer so
  // the 00:00 label aligns with the grid start, not the header.
  const HEADER_HEIGHT = 52;

  return (
    <div className="flex min-w-0 flex-1">
      {/* Time axis (only for first column) */}
      {showTimeAxis && (
        <div className="shrink-0 w-14 flex flex-col border-r border-border/30">
          {/* Spacer matching sticky day header */}
          <div
            style={{ height: `${HEADER_HEIGHT}px`, flexShrink: 0 }}
            className="border-b border-border/60"
          />
          {/* Time labels */}
          <div
            className="relative flex-1"
            style={{ height: `${totalHeight}px` }}
          >
            {hourLabels.map(({ minutes, label }) => {
              const topPx = ((minutes - DAY_START) / 15) * SLOT_HEIGHT;
              return (
                <div
                  key={minutes}
                  className="absolute right-1.5 text-[9px] font-mono text-muted-foreground/70 -translate-y-1/2 bg-card pr-0.5 leading-none"
                  style={{ top: `${topPx}px` }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Column */}
      <div
        className={`flex flex-col flex-1 min-w-0 ${showTimeAxis ? "" : "border-l border-border/40"}`}
      >
        {/* Day header */}
        <div
          className={`sticky top-0 z-20 flex flex-col items-center py-1.5 border-b border-border/60 ${isToday ? "bg-primary/10" : "bg-card"}`}
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}
          >
            {dayShort}
          </span>
          <span
            className={`text-sm font-bold leading-tight ${isToday ? "text-primary" : "text-foreground"}`}
          >
            {dayNum}
          </span>
          <span className="text-[9px] text-muted-foreground/60">
            {monthShort}
          </span>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          role="presentation"
          className="relative"
          style={{ height: `${totalHeight}px` }}
          onClick={handleGridClick}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            handleGridClick(e as unknown as React.MouseEvent)
          }
          onDragOver={handleDragOver}
          onDragLeave={onDragLeave}
          onDrop={handleDrop}
          onTouchEnd={handleTouchEnd}
          data-ocid="planner.day.canvas_target"
        >
          {/* Hour lines */}
          {hourLabels.map(({ minutes }) => {
            const topPx = ((minutes - DAY_START) / 15) * SLOT_HEIGHT;
            return (
              <div
                key={minutes}
                className="absolute left-0 right-0 border-t border-border/25 pointer-events-none"
                style={{ top: `${topPx}px` }}
              />
            );
          })}

          {/* 15-min slot rows with hover highlight */}
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
            const slotMinutes = DAY_START + i * 15;
            const topPx = i * SLOT_HEIGHT;
            const isHour = slotMinutes % 60 === 0;
            const isDropTarget =
              dropHighlightSlot !== null && slotMinutes === dropHighlightSlot;

            return (
              <div
                key={slotMinutes}
                className={`absolute left-0 right-0 transition-colors pointer-events-none
                  ${isDropTarget ? "bg-primary/20 border-t-2 border-primary/70" : ""}
                  ${!isDropTarget && isHour ? "border-t border-border/20" : ""}
                  ${!isDropTarget && !isHour ? "border-t border-border/8" : ""}
                `}
                style={{ top: `${topPx}px`, height: `${SLOT_HEIGHT}px` }}
              />
            );
          })}

          {/* Ghost templates (only when no events on this day) */}
          {showGhosts &&
            dayEvents.length === 0 &&
            GHOST_TEMPLATES.map((g) => (
              <GhostTemplateBlock
                key={`${g.subject}-${g.startMinutes}`}
                {...g}
              />
            ))}

          {/* Drag ghost overlay (current dragging event) */}
          {draggingEvent && dropHighlightSlot !== null && (
            <div
              className="absolute left-1 right-1 rounded-md border border-dashed border-primary/70 bg-primary/15 pointer-events-none z-20"
              style={{
                top: `${((dropHighlightSlot - DAY_START) / 15) * SLOT_HEIGHT}px`,
                height: `${Math.max(((draggingEvent.endMinutes - draggingEvent.startMinutes) / 15) * SLOT_HEIGHT, SLOT_HEIGHT)}px`,
              }}
            />
          )}

          {/* Events */}
          {layoutSlots.map(({ event, left, width }) => (
            <EventBlock
              key={event.id}
              event={event}
              left={left}
              width={width}
              onEdit={onEditEvent}
              onDragStart={onDragStart}
              onTouchDragStart={onTouchDragStart}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Event Dialog ───────────────────────────────────────────────────────────────

interface EventDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initial: Partial<PlannerEvent>;
  onSave: (event: Omit<PlannerEvent, "id"> & { id?: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function EventDialog({
  open,
  mode,
  initial,
  onSave,
  onDelete,
  onClose,
}: EventDialogProps) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [subject, setSubject] = useState<SubjectType>(
    initial.subject ?? "general",
  );
  const [startMinutes, setStartMinutes] = useState(
    initial.startMinutes ?? DAY_START,
  );
  const [endMinutes, setEndMinutes] = useState(
    initial.endMinutes ?? DAY_START + 60,
  );
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(initial.title ?? "");
      setSubject(initial.subject ?? "general");
      setStartMinutes(initial.startMinutes ?? DAY_START);
      setEndMinutes(initial.endMinutes ?? DAY_START + 60);
      setNotes(initial.notes ?? "");
      setError("");
    }
  }, [
    open,
    initial.title,
    initial.subject,
    initial.startMinutes,
    initial.endMinutes,
    initial.notes,
  ]);

  const handleSave = () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (endMinutes <= startMinutes) {
      setError("End time must be after start time");
      return;
    }
    onSave({
      id: initial.id,
      date: initial.date ?? todayStr(),
      title: title.trim(),
      subject,
      startMinutes,
      endMinutes,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md bg-card border-border"
        data-ocid="planner.event.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === "create" ? "Add Block" : "Edit Block"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError("");
              }}
              placeholder="e.g. Irodov Chapter 3"
              className="bg-muted/50 border-border"
              data-ocid="planner.event.input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Select
              value={subject}
              onValueChange={(v) => setSubject(v as SubjectType)}
            >
              <SelectTrigger
                className="bg-muted/50 border-border"
                data-ocid="planner.event.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(SUBJECT_CONFIG) as [
                    SubjectType,
                    (typeof SUBJECT_CONFIG)[SubjectType],
                  ][]
                ).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Select
                value={String(startMinutes)}
                onValueChange={(v) => {
                  setStartMinutes(Number(v));
                  setError("");
                }}
              >
                <SelectTrigger
                  className="bg-muted/50 border-border text-xs"
                  data-ocid="planner.event.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {TIME_OPTIONS.filter((o) => o.value < DAY_END).map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End</Label>
              <Select
                value={String(endMinutes)}
                onValueChange={(v) => {
                  setEndMinutes(Number(v));
                  setError("");
                }}
              >
                <SelectTrigger
                  className="bg-muted/50 border-border text-xs"
                  data-ocid="planner.event.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {TIME_OPTIONS.filter((o) => o.value > startMinutes).map(
                    (o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details..."
              rows={2}
              className="bg-muted/50 border-border resize-none text-sm"
              data-ocid="planner.event.textarea"
            />
          </div>

          {error && (
            <p
              className="text-xs text-destructive"
              data-ocid="planner.event.error_state"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {mode === "edit" && onDelete && (
            <Button
              variant="outline"
              onClick={onDelete}
              className="border-destructive/50 text-destructive hover:bg-destructive/10 sm:mr-auto"
              data-ocid="planner.event.delete_button"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border"
            data-ocid="planner.event.cancel_button"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-ocid="planner.event.save_button"
          >
            {mode === "create" ? (
              <>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Block
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const DAY_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function PlannerPage() {
  const [events, setEvents] = useState<PlannerEvent[]>(() => loadEvents());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [dayCount, setDayCount] = useState<number>(1);

  // Drag state
  const [draggingEvent, setDraggingEvent] = useState<PlannerEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dropHighlight, setDropHighlight] = useState<{
    date: string;
    slot: number;
  } | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogInitial, setDialogInitial] = useState<Partial<PlannerEvent>>({});

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const [y, m] = date.split("-").map(Number);
    setCalendarYear(y);
    setCalendarMonth(m - 1);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const openCreateDialog = (date: string, startMinutes: number) => {
    setDialogMode("create");
    setDialogInitial({
      date,
      startMinutes,
      endMinutes: Math.min(startMinutes + 60, DAY_END),
    });
    setDialogOpen(true);
  };

  const openEditDialog = (event: PlannerEvent) => {
    setDialogMode("edit");
    setDialogInitial(event);
    setDialogOpen(true);
  };

  const handleSaveEvent = (
    eventData: Omit<PlannerEvent, "id"> & { id?: string },
  ) => {
    if (eventData.id) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventData.id ? { ...eventData, id: eventData.id! } : e,
        ),
      );
    } else {
      setEvents((prev) => [...prev, { ...eventData, id: generateId() }]);
    }
    setDialogOpen(false);
  };

  const handleDeleteEvent = () => {
    if (dialogInitial.id) {
      setEvents((prev) => prev.filter((e) => e.id !== dialogInitial.id));
    }
    setDialogOpen(false);
  };

  const handleDragStart = (event: PlannerEvent) => {
    setDraggingEvent(event);
  };

  const handleTouchDragStart = useCallback(
    (event: PlannerEvent, _touch: React.Touch) => {
      setDraggingEvent(event);
    },
    [],
  );

  const handleDragOverDay = (date: string, slot: number) => {
    setDragOverDate(date);
    setDropHighlight({ date, slot });
  };

  const handleDragLeave = () => {
    setDropHighlight(null);
  };

  const handleDropInDay = (date: string, newStartMinutes: number) => {
    if (!draggingEvent) return;
    const duration = draggingEvent.endMinutes - draggingEvent.startMinutes;
    const snappedStart = Math.max(
      DAY_START,
      Math.min(newStartMinutes, DAY_END - 15),
    );
    const newEnd = Math.min(snappedStart + duration, DAY_END);
    setEvents((prev) =>
      prev.map((e) =>
        e.id === draggingEvent.id
          ? { ...e, startMinutes: snappedStart, endMinutes: newEnd, date }
          : e,
      ),
    );
    setDraggingEvent(null);
    setDropHighlight(null);
  };

  const handleDropToCalendar = (newDate: string) => {
    if (!draggingEvent) return;
    setEvents((prev) =>
      prev.map((e) =>
        e.id === draggingEvent.id ? { ...e, date: newDate } : e,
      ),
    );
    setSelectedDate(newDate);
    const [y, m] = newDate.split("-").map(Number);
    setCalendarYear(y);
    setCalendarMonth(m - 1);
    setDraggingEvent(null);
    setDropHighlight(null);
  };

  // Build list of dates for multi-day view
  const visibleDates = Array.from({ length: dayCount }, (_, i) =>
    addDays(selectedDate, i),
  );

  const dayEvents = events.filter((e) => e.date === selectedDate);
  const totalMinutes = dayEvents.reduce(
    (sum, e) => sum + (e.endMinutes - e.startMinutes),
    0,
  );
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Day Planner</h1>
            <p className="text-xs text-muted-foreground font-mono">
              Plan your study sessions · 15-min blocks · 00:00–24:00
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Day count selector */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            <Columns className="w-3.5 h-3.5 text-muted-foreground ml-1 shrink-0" />
            {DAY_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDayCount(n)}
                className={`w-7 h-7 rounded text-xs font-mono font-semibold transition-all
                  ${dayCount === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                data-ocid="planner.daycount.toggle"
              >
                {n}
              </button>
            ))}
          </div>

          <Button
            onClick={() =>
              openCreateDialog(
                selectedDate,
                Math.max(
                  DAY_START,
                  Math.min(
                    Math.floor(
                      (new Date().getHours() * 60 + new Date().getMinutes()) /
                        15,
                    ) * 15,
                    DAY_END - 15,
                  ),
                ),
              )
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            data-ocid="planner.add_block.primary_button"
          >
            <Plus className="w-4 h-4" />
            Add Block
          </Button>
        </div>
      </motion.div>

      {/* Quick stats */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDate}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-4 flex-wrap"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
            <span className="text-xs text-muted-foreground font-mono">
              From:
            </span>
            <span className="text-xs font-semibold text-foreground">
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                "en-IN",
                {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                },
              )}
            </span>
            {dayCount > 1 && (
              <>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-xs font-semibold text-foreground">
                  {new Date(
                    `${addDays(selectedDate, dayCount - 1)}T00:00:00`,
                  ).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </>
            )}
          </div>
          {dayEvents.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-xs text-primary font-mono">
                {dayEvents.length} block{dayEvents.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-primary font-mono">
                {totalHours}h planned
              </span>
            </div>
          )}
          {dayEvents.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(Object.keys(SUBJECT_CONFIG) as SubjectType[]).map((subj) => {
                const count = dayEvents.filter(
                  (e) => e.subject === subj,
                ).length;
                if (!count) return null;
                const cfg = SUBJECT_CONFIG[subj];
                return (
                  <span
                    key={subj}
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text} font-mono`}
                  >
                    {cfg.label} ×{count}
                  </span>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        {/* Left: Month Calendar */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MonthCalendar
            year={calendarYear}
            month={calendarMonth}
            selectedDate={selectedDate}
            multiDayStart={selectedDate}
            multiDayCount={dayCount}
            events={events}
            dragOverDate={dragOverDate}
            onSelectDate={handleSelectDate}
            onDragOver={setDragOverDate}
            onDropEvent={handleDropToCalendar}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          {/* Mini legend */}
          <div className="mt-3 px-1 grid grid-cols-2 gap-1.5">
            {(
              Object.entries(SUBJECT_CONFIG) as [
                SubjectType,
                (typeof SUBJECT_CONFIG)[SubjectType],
              ][]
            ).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                <span className="text-[10px] text-muted-foreground">
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>

          {/* Ghost templates note */}
          <p className="mt-3 px-1 text-[10px] text-muted-foreground/50 font-mono leading-relaxed">
            Faint blocks shown on empty days are templates · click a slot to add
            a real block
          </p>
        </motion.div>

        {/* Right: Day columns */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="rounded-xl border border-border bg-card">
            {/* Horizontally scrollable, vertically extends with page */}
            <div
              className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
              style={{ overflowY: "visible" }}
            >
              <div
                className="flex min-w-0"
                style={{
                  minWidth: dayCount > 1 ? `${dayCount * 160}px` : undefined,
                }}
              >
                {visibleDates.map((date, idx) => (
                  <DayColumn
                    key={date}
                    date={date}
                    events={events}
                    draggingEvent={draggingEvent}
                    dropHighlightSlot={
                      dropHighlight?.date === date ? dropHighlight.slot : null
                    }
                    showGhosts={idx === 0}
                    onCreateBlock={openCreateDialog}
                    onEditEvent={openEditDialog}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOverDay}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropInDay}
                    onTouchDragStart={handleTouchDragStart}
                    showTimeAxis={idx === 0}
                  />
                ))}
              </div>
            </div>

            {/* Quick add hint */}
            <div className="px-4 py-2 border-t border-border/40 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-mono">
                Click any slot to add · Drag to move · Numbers above select how
                many days to view at once
              </p>
            </div>
          </div>

          {/* Empty state */}
          {dayEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-center py-4"
              data-ocid="planner.day.empty_state"
            >
              <p className="text-xs text-muted-foreground font-mono">
                No blocks for this day.{" "}
                <button
                  type="button"
                  onClick={() => openCreateDialog(selectedDate, 9 * 60)}
                  className="text-primary hover:underline"
                  data-ocid="planner.day.add_first.button"
                >
                  Add your first block →
                </button>
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      <EventDialog
        open={dialogOpen}
        mode={dialogMode}
        initial={dialogInitial}
        onSave={handleSaveEvent}
        onDelete={dialogMode === "edit" ? handleDeleteEvent : undefined}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

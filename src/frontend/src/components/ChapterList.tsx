import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import type { Chapter, Resource } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  useAddChapter,
  useDeleteChapter,
  useGetChaptersByResource,
  useUpdateChapterQuestions,
  useUpdateChapterStatus,
} from "../hooks/useQueries";

const STATUS_OPTIONS = [
  "Currently Doing",
  "Not Started",
  "In Progress",
  "Done",
] as const;

const STATUS_ORDER: Record<string, number> = {
  "Currently Doing": 0,
  "In Progress": 1,
  "Not Started": 2,
  Done: 3,
};

interface ChapterListProps {
  resource: Resource;
  defaultOpen?: boolean;
}

function QuestionBadge({
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

  if (!editing && total === 0) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover/chapter:opacity-100 text-xs text-muted-foreground hover:text-primary transition-all px-1.5 py-0.5 rounded border border-transparent hover:border-primary/30 flex items-center gap-0.5"
        title="Add question count"
      >
        <Edit2 className="w-2.5 h-2.5" />
        <span>Q</span>
      </button>
    );
  }

  if (!editing) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
      <button
        type="button"
        onClick={() => {
          setDoneVal(String(chapter.doneQuestions));
          setTotalVal(String(chapter.totalQuestions));
          setEditing(true);
        }}
        className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors shrink-0 ${
          pct >= 100
            ? "bg-emerald-400/15 text-emerald-400 border-emerald-400/30"
            : pct > 0
              ? "bg-amber-400/15 text-amber-400 border-amber-400/30"
              : "bg-muted/30 text-muted-foreground border-border"
        }`}
        title="Click to update"
      >
        {done}/{total}
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-1 shrink-0"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <Input
        value={doneVal}
        onChange={(e) => setDoneVal(e.target.value)}
        className="h-6 w-14 text-xs bg-input border-border text-center p-1"
        placeholder="done"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            updateQ.mutate({
              chapterId: chapter.id,
              doneQuestions: BigInt(Number.parseInt(doneVal) || 0),
              totalQuestions: BigInt(Number.parseInt(totalVal) || 0),
              resourceId,
            });
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
      />
      <span className="text-muted-foreground text-xs">/</span>
      <Input
        value={totalVal}
        onChange={(e) => setTotalVal(e.target.value)}
        className="h-6 w-14 text-xs bg-input border-border text-center p-1"
        placeholder="total"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            updateQ.mutate({
              chapterId: chapter.id,
              doneQuestions: BigInt(Number.parseInt(doneVal) || 0),
              totalQuestions: BigInt(Number.parseInt(totalVal) || 0),
              resourceId,
            });
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button
        size="sm"
        className="h-6 px-2 text-xs bg-primary text-primary-foreground"
        disabled={updateQ.isPending}
        onClick={() => {
          updateQ.mutate({
            chapterId: chapter.id,
            doneQuestions: BigInt(Number.parseInt(doneVal) || 0),
            totalQuestions: BigInt(Number.parseInt(totalVal) || 0),
            resourceId,
          });
          setEditing(false);
        }}
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

export default function ChapterList({
  resource,
  defaultOpen = false,
}: ChapterListProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterTotalQ, setNewChapterTotalQ] = useState("");
  const [newChapterDoneQ, setNewChapterDoneQ] = useState("");

  const { data: chapters = [], isLoading: chaptersLoading } =
    useGetChaptersByResource(resource.id);
  const { isFetching: actorFetching, actor } = useActor();
  const isLoading = chaptersLoading && (actorFetching || !actor);
  const updateStatus = useUpdateChapterStatus();
  const deleteChapter = useDeleteChapter();
  const addChapter = useAddChapter();

  const done = chapters.filter((c) => c.status === "Done").length;
  const total = chapters.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleAddChapter = async () => {
    if (!newChapterName.trim()) return;
    const id = `${resource.id}_ch_${Date.now()}`;
    await addChapter.mutateAsync({
      id,
      resourceId: resource.id,
      name: newChapterName.trim(),
      totalQuestions: BigInt(Number.parseInt(newChapterTotalQ) || 0),
      doneQuestions: BigInt(Number.parseInt(newChapterDoneQ) || 0),
    });
    setNewChapterName("");
    setNewChapterTotalQ("");
    setNewChapterDoneQ("");
    setAddingChapter(false);
  };

  const handleStatusChange = (chapterId: string, status: string) => {
    updateStatus.mutate({ chapterId, status, resourceId: resource.id });
  };

  const handleDelete = (chapterId: string) => {
    deleteChapter.mutate({ chapterId, resourceId: resource.id });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors group"
        >
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {resource.name}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {done}/{total} · {pct}%
              </span>
            </div>
            <div className="mt-1.5 h-1 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: "oklch(0.65 0.2 145)",
                }}
              />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div
          className="mt-1 ml-4 border-l border-border pl-4 space-y-1 pb-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {/* Question Progress Summary Chart */}
          {!isLoading && chapters.some((c) => Number(c.totalQuestions) > 0) && (
            <div className="mb-3 p-3 rounded-lg bg-muted/20 border border-border/50">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Question Progress
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {chapters
                  .filter((c) => Number(c.totalQuestions) > 0)
                  .map((c) => {
                    const total = Number(c.totalQuestions);
                    const done = Number(c.doneQuestions);
                    const pctQ =
                      total > 0
                        ? Math.min(100, Math.round((done / total) * 100))
                        : 0;
                    return (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground truncate w-28 shrink-0">
                          {c.name.length > 20
                            ? `${c.name.slice(0, 20)}…`
                            : c.name}
                        </span>
                        <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pctQ}%`,
                              background:
                                pctQ >= 100
                                  ? "oklch(0.65 0.2 145)"
                                  : pctQ > 0
                                    ? "oklch(0.78 0.18 55)"
                                    : "oklch(0.35 0.01 240)",
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs font-mono shrink-0 w-16 text-right ${
                            pctQ >= 100
                              ? "text-emerald-400"
                              : pctQ > 0
                                ? "text-amber-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {done}/{total}Q
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
              <Skeleton key={i} className="h-9 rounded-md" />
            ))
          ) : chapters.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 italic">
              No chapters yet. Add one below.
            </p>
          ) : (
            [...chapters]
              .sort(
                (a, b) =>
                  (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2),
              )
              .map((chapter) => {
                const chTotal = Number(chapter.totalQuestions);
                const chDone = Number(chapter.doneQuestions);
                const chPct =
                  chTotal > 0
                    ? Math.min(100, Math.round((chDone / chTotal) * 100))
                    : 0;
                return (
                  <div
                    key={chapter.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/20 group/chapter"
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        chapter.status === "Done"
                          ? "bg-emerald-400"
                          : chapter.status === "Currently Doing"
                            ? "bg-cyan-400"
                            : chapter.status === "In Progress"
                              ? "bg-amber-400"
                              : "bg-muted-foreground/30"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm block truncate ${
                          chapter.status === "Done"
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }`}
                      >
                        {chapter.name}
                      </span>
                      {chTotal > 0 && (
                        <div className="mt-0.5 h-0.5 bg-muted/40 rounded-full overflow-hidden w-full">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${chPct}%`,
                              background:
                                chPct >= 100
                                  ? "oklch(0.65 0.2 145)"
                                  : chPct > 0
                                    ? "oklch(0.78 0.18 55)"
                                    : "oklch(0.35 0.01 240)",
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <QuestionBadge chapter={chapter} resourceId={resource.id} />
                    <Select
                      value={chapter.status}
                      onValueChange={(val) =>
                        handleStatusChange(chapter.id, val)
                      }
                    >
                      <SelectTrigger
                        className={`h-7 w-36 text-xs border shrink-0 ${
                          chapter.status === "Done"
                            ? "status-done"
                            : chapter.status === "Currently Doing"
                              ? "bg-cyan-400/15 text-cyan-400 border-cyan-400/30"
                              : chapter.status === "In Progress"
                                ? "status-in-progress"
                                : "status-not-started"
                        }`}
                      >
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
                    <button
                      type="button"
                      onClick={() => handleDelete(chapter.id)}
                      title="Remove from this resource"
                      className="opacity-30 group-hover/chapter:opacity-100 text-muted-foreground hover:text-red-400 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
          )}

          {/* Add chapter */}
          {addingChapter ? (
            <div
              className="flex flex-col gap-2 pt-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              <Input
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                placeholder="Chapter name..."
                className="h-8 text-xs bg-input border-border"
                autoFocus
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") handleAddChapter();
                  if (e.key === "Escape") {
                    setAddingChapter(false);
                    setNewChapterName("");
                    setNewChapterTotalQ("");
                    setNewChapterDoneQ("");
                  }
                }}
                data-ocid="chapter.input"
              />
              <div className="flex items-center gap-2">
                <Input
                  value={newChapterTotalQ}
                  onChange={(e) => setNewChapterTotalQ(e.target.value)}
                  placeholder="Total Q (optional)"
                  className="h-8 text-xs bg-input border-border flex-1"
                  type="number"
                  min="0"
                  onKeyDown={(e) => e.stopPropagation()}
                  data-ocid="chapter.totalq.input"
                />
                <Input
                  value={newChapterDoneQ}
                  onChange={(e) => setNewChapterDoneQ(e.target.value)}
                  placeholder="Done so far"
                  className="h-8 text-xs bg-input border-border flex-1"
                  type="number"
                  min="0"
                  onKeyDown={(e) => e.stopPropagation()}
                  data-ocid="chapter.doneq.input"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddChapter();
                  }}
                  disabled={!newChapterName.trim() || addChapter.isPending}
                  className="h-8 text-xs bg-primary text-primary-foreground"
                  data-ocid="chapter.add_button"
                >
                  {addChapter.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddingChapter(false);
                    setNewChapterName("");
                    setNewChapterTotalQ("");
                    setNewChapterDoneQ("");
                  }}
                  className="h-8 text-xs"
                  data-ocid="chapter.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddingChapter(true);
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1 mt-1"
              data-ocid="chapter.open_modal_button"
            >
              <Plus className="w-3.5 h-3.5" />
              Add chapter
            </button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

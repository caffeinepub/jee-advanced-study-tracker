import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Check,
  Clock,
  Edit2,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import React, { useState } from "react";
import type { Task } from "../backend";
import { useDeleteTask, useUpdateTask } from "../hooks/useQueries";

const STATUS_OPTIONS = ["Todo", "In Progress", "Done"] as const;
const SUBJECT_OPTIONS = ["Physics", "Chemistry", "Maths", "General"] as const;

function formatDate(dueDate?: bigint): string {
  if (!dueDate) return "";
  const ms = Number(dueDate) / 1_000_000;
  return new Date(ms).toISOString().split("T")[0];
}

function formatDisplayDate(dueDate?: bigint): string {
  if (!dueDate) return "";
  const ms = Number(dueDate) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function addDays(days: number): bigint {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return BigInt(d.getTime()) * BigInt(1_000_000);
}

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [subjectTag, setSubjectTag] = useState(task.subjectTag);
  const [dueDate, setDueDate] = useState(formatDate(task.dueDate));
  const [status, setStatus] = useState(task.status);
  const [revisePopoverOpen, setRevisePopoverOpen] = useState(false);
  const [customReviseDate, setCustomReviseDate] = useState("");

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleSave = async () => {
    const dueDateBigInt = dueDate
      ? BigInt(new Date(dueDate).getTime()) * BigInt(1_000_000)
      : null;
    await updateTask.mutateAsync({
      taskId: task.id,
      title,
      description,
      subjectTag,
      dueDate: dueDateBigInt,
      status,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description);
    setSubjectTag(task.subjectTag);
    setDueDate(formatDate(task.dueDate));
    setStatus(task.status);
    setEditing(false);
  };

  const handleRevise = (newDueDate: bigint) => {
    updateTask.mutate({
      taskId: task.id,
      title: task.title,
      description: task.description,
      subjectTag: task.subjectTag,
      dueDate: newDueDate,
      status: "Revise",
    });
    setRevisePopoverOpen(false);
  };

  const handleDontRevise = () => {
    updateTask.mutate({
      taskId: task.id,
      title: task.title,
      description: task.description,
      subjectTag: task.subjectTag,
      dueDate: task.dueDate ?? null,
      status: "Done",
    });
  };

  const isRevise = task.status === "Revise";

  const subjectClass =
    task.subjectTag === "Physics"
      ? "subject-physics"
      : task.subjectTag === "Chemistry"
        ? "subject-chemistry"
        : task.subjectTag === "Maths"
          ? "subject-maths"
          : "subject-general";

  const statusClass =
    task.status === "Done"
      ? "status-done"
      : task.status === "In Progress"
        ? "status-in-progress"
        : task.status === "Revise"
          ? "text-violet-400 bg-violet-400/10"
          : "status-not-started";

  if (editing) {
    return (
      <div className="bg-card border border-primary/30 rounded-lg p-4 space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="bg-input border-border font-medium"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="bg-input border-border text-sm resize-none"
          rows={2}
        />
        <div className="grid grid-cols-3 gap-2">
          <Select value={subjectTag} onValueChange={setSubjectTag}>
            <SelectTrigger className="h-8 text-xs bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs bg-input border-border">
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
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-8 text-xs bg-input border border-border rounded-md px-2 text-foreground font-mono"
          />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-7 text-xs"
          >
            <X className="w-3 h-3 mr-1" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!title.trim() || updateTask.isPending}
            className="h-7 text-xs bg-primary text-primary-foreground"
          >
            {updateTask.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Check className="w-3 h-3 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-card border rounded-lg p-4 group transition-colors ${
        isRevise
          ? "border-violet-400/30 hover:border-violet-400/50"
          : task.status === "Done"
            ? "border-border opacity-60"
            : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => {
            if (isRevise) return; // revise tasks use their own controls
            const newStatus =
              task.status === "Done"
                ? "Todo"
                : task.status === "Todo"
                  ? "In Progress"
                  : "Done";
            updateTask.mutate({
              taskId: task.id,
              title: task.title,
              description: task.description,
              subjectTag: task.subjectTag,
              dueDate: task.dueDate ?? null,
              status: newStatus,
            });
          }}
          className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
            isRevise
              ? "border-violet-400 bg-violet-400/20"
              : task.status === "Done"
                ? "bg-emerald-400 border-emerald-400"
                : task.status === "In Progress"
                  ? "border-amber-400"
                  : "border-border hover:border-primary"
          }`}
        >
          {task.status === "Done" && (
            <Check className="w-2.5 h-2.5 text-background" />
          )}
          {isRevise && <RotateCcw className="w-2 h-2 text-violet-400" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`text-sm font-medium ${
                task.status === "Done"
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {task.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Revise When button — only for non-revise tasks */}
              {!isRevise && task.status !== "Done" && (
                <Popover
                  open={revisePopoverOpen}
                  onOpenChange={setRevisePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      title="Revise When"
                      className="text-muted-foreground hover:text-violet-400 transition-colors"
                      data-ocid="todo.revise.button"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="bg-card border-border p-3 w-52"
                    align="end"
                  >
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      Revise When
                    </p>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleRevise(addDays(1))}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 text-foreground transition-colors"
                      >
                        1 day later
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevise(addDays(2))}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 text-foreground transition-colors"
                      >
                        2 days later
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevise(addDays(3))}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 text-foreground transition-colors"
                      >
                        3 days later
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevise(addDays(7))}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 text-foreground transition-colors"
                      >
                        1 week later
                      </button>
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                        <input
                          type="date"
                          value={customReviseDate}
                          onChange={(e) => setCustomReviseDate(e.target.value)}
                          className="flex-1 h-7 text-xs bg-input border border-border rounded px-1.5 text-foreground font-mono"
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-violet-400/20 text-violet-400 border border-violet-400/30 hover:bg-violet-400/30"
                          disabled={!customReviseDate}
                          onClick={() => {
                            if (customReviseDate) {
                              handleRevise(
                                BigInt(new Date(customReviseDate).getTime()) *
                                  BigInt(1_000_000),
                              );
                            }
                          }}
                        >
                          Set
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Don't revise — only for revise tasks */}
              {isRevise && (
                <button
                  type="button"
                  title="Don't revise"
                  onClick={handleDontRevise}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                  data-ocid="todo.dont_revise.button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete "{task.title}"? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteTask.mutate(task.id)}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono ${subjectClass}`}
            >
              {task.subjectTag}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono ${statusClass}`}
            >
              {isRevise ? "Revise" : task.status}
            </span>
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 text-xs font-mono ${
                  isRevise ? "text-violet-400" : "text-muted-foreground"
                }`}
              >
                {isRevise ? (
                  <Clock className="w-3 h-3" />
                ) : (
                  <Calendar className="w-3 h-3" />
                )}
                {formatDisplayDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

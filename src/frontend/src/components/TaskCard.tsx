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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Check, Edit2, Loader2, Trash2, X } from "lucide-react";
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
      className={`bg-card border border-border rounded-lg p-4 group hover:border-border/80 transition-colors ${task.status === "Done" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => {
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
            task.status === "Done"
              ? "bg-emerald-400 border-emerald-400"
              : task.status === "In Progress"
                ? "border-amber-400"
                : "border-border hover:border-primary"
          }`}
        >
          {task.status === "Done" && (
            <Check className="w-2.5 h-2.5 text-background" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`text-sm font-medium ${task.status === "Done" ? "line-through text-muted-foreground" : "text-foreground"}`}
            >
              {task.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
              {task.status}
            </span>
            {task.dueDate && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Calendar className="w-3 h-3" />
                {formatDisplayDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

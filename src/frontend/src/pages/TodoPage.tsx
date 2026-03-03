import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Filter, Plus } from "lucide-react";
import React, { useState } from "react";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";
import { useGetTasks } from "../hooks/useQueries";

const STATUS_FILTERS = ["All", "Todo", "In Progress", "Done"] as const;
const SUBJECT_FILTERS = [
  "All",
  "Physics",
  "Chemistry",
  "Maths",
  "General",
] as const;

export default function TodoPage() {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tasks = [], isLoading } = useGetTasks(
    statusFilter === "All" ? undefined : statusFilter,
  );

  const filteredTasks = tasks.filter(
    (t) => subjectFilter === "All" || t.subjectTag === subjectFilter,
  );

  const todoCount = tasks.filter((t) => t.status === "Todo").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "In Progress",
  ).length;
  const doneCount = tasks.filter((t) => t.status === "Done").length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-sky-400" />
            Tasks
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs font-mono text-muted-foreground">
            <span>
              <span className="text-foreground">{todoCount}</span> todo
            </span>
            <span>
              <span className="text-amber-400">{inProgressCount}</span> in
              progress
            </span>
            <span>
              <span className="text-emerald-400">{doneCount}</span> done
            </span>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <TaskForm onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s === "All" ? "All Statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="h-8 w-36 text-xs bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECT_FILTERS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s === "All" ? "All Subjects" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No tasks found.</p>
          <p className="text-xs mt-1">
            {statusFilter !== "All" || subjectFilter !== "All"
              ? "Try adjusting your filters."
              : "Create your first task to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

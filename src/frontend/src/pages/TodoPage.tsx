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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Filter, Plus, RotateCcw } from "lucide-react";
import React, { useState } from "react";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";
import { useGetTasks } from "../hooks/useQueries";

const SUBJECT_FILTERS = [
  "All",
  "Physics",
  "Chemistry",
  "Maths",
  "General",
] as const;

export default function TodoPage() {
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all tasks (no status filter — we split by tab)
  const { data: tasks = [], isLoading } = useGetTasks();

  const activeTasks = tasks.filter(
    (t) => t.status !== "Done" && t.status !== "Revise",
  );
  const reviseTasks = tasks.filter((t) => t.status === "Revise");
  const doneTasks = tasks.filter((t) => t.status === "Done");

  const filterBySubject = (list: typeof tasks) =>
    list.filter(
      (t) => subjectFilter === "All" || t.subjectTag === subjectFilter,
    );

  const todoCount = activeTasks.filter((t) => t.status === "Todo").length;
  const inProgressCount = activeTasks.filter(
    (t) => t.status === "In Progress",
  ).length;

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
              <span className="text-violet-400">{reviseTasks.length}</span> to
              revise
            </span>
            <span>
              <span className="text-emerald-400">{doneTasks.length}</span> done
            </span>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary text-primary-foreground"
              data-ocid="todo.open_modal_button"
            >
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

      {/* Subject filter */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger
            className="h-8 w-36 text-xs bg-input border-border"
            data-ocid="todo.filter.tab"
          >
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

      {/* Tabs: Active / Revision / Done */}
      <Tabs defaultValue="active">
        <TabsList className="bg-muted/50 border border-border mb-4">
          <TabsTrigger
            value="active"
            className="text-xs font-mono data-[state=active]:bg-card"
            data-ocid="todo.active.tab"
          >
            Active
            {activeTasks.length > 0 && (
              <span className="ml-1.5 bg-sky-400/20 text-sky-400 text-xs px-1.5 py-0.5 rounded-full font-mono">
                {activeTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="revision"
            className="text-xs font-mono data-[state=active]:bg-card"
            data-ocid="todo.revision.tab"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Revision
            {reviseTasks.length > 0 && (
              <span className="ml-1.5 bg-violet-400/20 text-violet-400 text-xs px-1.5 py-0.5 rounded-full font-mono">
                {reviseTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="done"
            className="text-xs font-mono data-[state=active]:bg-card"
            data-ocid="todo.done.tab"
          >
            Done
          </TabsTrigger>
        </TabsList>

        {/* Active tasks */}
        <TabsContent value="active">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filterBySubject(activeTasks).length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="todo.active.empty_state"
            >
              <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No active tasks.</p>
              <p className="text-xs mt-1">
                Create your first task to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filterBySubject(activeTasks).map((task, i) => (
                <div key={task.id} data-ocid={`todo.item.${i + 1}`}>
                  <TaskCard task={task} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Revision tasks */}
        <TabsContent value="revision">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filterBySubject(reviseTasks).length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="todo.revision.empty_state"
            >
              <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No revision tasks yet.</p>
              <p className="text-xs mt-1">
                On any active task, hover and click the revision icon to
                schedule a future revision.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filterBySubject(reviseTasks)
                .sort((a, b) => Number(a.dueDate ?? 0) - Number(b.dueDate ?? 0))
                .map((task, i) => (
                  <div key={task.id} data-ocid={`todo.revision.item.${i + 1}`}>
                    <TaskCard task={task} />
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Done / archive */}
        <TabsContent value="done">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filterBySubject(doneTasks).length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="todo.done.empty_state"
            >
              <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No completed tasks yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filterBySubject(doneTasks).map((task, i) => (
                <div key={task.id} data-ocid={`todo.done.item.${i + 1}`}>
                  <TaskCard task={task} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

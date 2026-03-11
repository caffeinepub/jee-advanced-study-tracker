import { Button } from "@/components/ui/button";
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
import { Loader2, Plus, Wifi } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";
import { useCreateTask } from "../hooks/useQueries";

const SUBJECT_OPTIONS = ["Physics", "Chemistry", "Maths", "General"] as const;

interface TaskFormProps {
  onClose: () => void;
}

export default function TaskForm({ onClose }: TaskFormProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectTag, setSubjectTag] = useState<string>("General");
  const [dueDate, setDueDate] = useState(todayStr);

  const createTask = useCreateTask();
  const { actor, isFetching: actorFetching } = useActor();
  const actorReady = !!actor && !actorFetching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !actorReady) return;

    const dueDateBigInt = dueDate
      ? BigInt(new Date(dueDate).getTime()) * BigInt(1_000_000)
      : null;

    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      subjectTag,
      dueDate: dueDateBigInt,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!actorReady && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2">
          <Wifi className="w-3.5 h-3.5 animate-pulse" />
          Connecting to backend...
        </div>
      )}
      <div>
        <Label
          htmlFor="task-title"
          className="text-xs font-mono text-muted-foreground uppercase tracking-wider"
        >
          Title *
        </Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="mt-1.5 bg-input border-border"
          autoFocus
        />
      </div>

      <div>
        <Label
          htmlFor="task-desc"
          className="text-xs font-mono text-muted-foreground uppercase tracking-wider"
        >
          Description
        </Label>
        <Textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details, notes, or context..."
          className="mt-1.5 bg-input border-border resize-none"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Subject
          </Label>
          <Select value={subjectTag} onValueChange={setSubjectTag}>
            <SelectTrigger className="mt-1.5 bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label
            htmlFor="task-due"
            className="text-xs font-mono text-muted-foreground uppercase tracking-wider"
          >
            Due Date
          </Label>
          <input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1.5 w-full h-10 bg-input border border-border rounded-md px-3 text-sm text-foreground font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="text-muted-foreground"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || createTask.isPending || !actorReady}
          className="bg-primary text-primary-foreground"
          data-ocid="todo.add_button"
        >
          {createTask.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

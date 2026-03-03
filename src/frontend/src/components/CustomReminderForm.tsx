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
import { Loader2, Plus } from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
  useAddRevisionReminder,
  useGetChaptersByResource,
  useGetResources,
} from "../hooks/useQueries";

interface CustomReminderFormProps {
  onClose: () => void;
}

// Powers-of-2 preset options (plus 7 days as a weekly option)
const INTERVAL_PRESETS = [
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "4", label: "4 days" },
  { value: "7", label: "7 days (weekly)" },
  { value: "8", label: "8 days" },
  { value: "16", label: "16 days" },
  { value: "32", label: "32 days" },
  { value: "custom", label: "Custom..." },
];

export default function CustomReminderForm({
  onClose,
}: CustomReminderFormProps) {
  // "library" | "custom" mode toggle
  const [chapterMode, setChapterMode] = useState<"library" | "custom">(
    "library",
  );

  // Library mode state
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");

  // Custom mode state
  const [customResource, setCustomResource] = useState("");
  const [customChapter, setCustomChapter] = useState("");

  // Interval state
  const [intervalPreset, setIntervalPreset] = useState("7");
  const [customIntervalDays, setCustomIntervalDays] = useState("7");

  const { data: resources = [] } = useGetResources();
  const { data: chapters = [] } = useGetChaptersByResource(selectedResourceId);
  const addReminder = useAddRevisionReminder();

  const finalIntervalDays =
    intervalPreset === "custom"
      ? Number.parseInt(customIntervalDays) || 7
      : Number.parseInt(intervalPreset) || 7;

  const isLibraryReady =
    chapterMode === "library" && selectedResourceId && selectedChapterId;
  const isCustomReady =
    chapterMode === "custom" && customResource.trim() && customChapter.trim();
  const canSubmit =
    (isLibraryReady || isCustomReady) &&
    finalIntervalDays > 0 &&
    !addReminder.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    let resourceId: string;
    let chapterId: string;

    if (chapterMode === "library") {
      resourceId = selectedResourceId;
      chapterId = selectedChapterId;
    } else {
      // Use the name as the id so it shows nicely in the reminder list
      resourceId = `custom_${customResource.trim().toLowerCase().replace(/\s+/g, "_")}`;
      chapterId = customChapter.trim();
    }

    const id = `rev_${chapterId}_${Date.now()}`;
    await addReminder.mutateAsync({
      id,
      resourceId,
      chapterId,
      intervalDays: BigInt(finalIntervalDays),
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle: From Library | Custom */}
      <div>
        <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Chapter Source
        </Label>
        <div
          className="flex rounded-lg border border-border overflow-hidden"
          data-ocid="reminder.mode_toggle"
        >
          <button
            type="button"
            onClick={() => setChapterMode("library")}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
              chapterMode === "library"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="reminder.library_tab"
          >
            From Library
          </button>
          <button
            type="button"
            onClick={() => setChapterMode("custom")}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
              chapterMode === "custom"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="reminder.custom_tab"
          >
            Custom
          </button>
        </div>
      </div>

      {chapterMode === "library" ? (
        <>
          {/* Resource dropdown */}
          <div>
            <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Resource
            </Label>
            <Select
              value={selectedResourceId}
              onValueChange={(val) => {
                setSelectedResourceId(val);
                setSelectedChapterId("");
              }}
            >
              <SelectTrigger
                className="mt-1.5 bg-input border-border"
                data-ocid="reminder.resource.select"
              >
                <SelectValue placeholder="Select resource..." />
              </SelectTrigger>
              <SelectContent>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.subject})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chapter dropdown */}
          <div>
            <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Chapter
            </Label>
            <Select
              value={selectedChapterId}
              onValueChange={setSelectedChapterId}
              disabled={!selectedResourceId || chapters.length === 0}
            >
              <SelectTrigger
                className="mt-1.5 bg-input border-border"
                data-ocid="reminder.chapter.select"
              >
                <SelectValue
                  placeholder={
                    !selectedResourceId
                      ? "Select resource first"
                      : chapters.length === 0
                        ? "No chapters"
                        : "Select chapter..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <>
          {/* Custom resource text input */}
          <div>
            <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Resource Name
            </Label>
            <Input
              value={customResource}
              onChange={(e) => setCustomResource(e.target.value)}
              placeholder="e.g. Irodov, HC Verma, NCERT..."
              className="mt-1.5 bg-input border-border"
              data-ocid="reminder.custom_resource.input"
            />
          </div>

          {/* Custom chapter text input */}
          <div>
            <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Chapter Name
            </Label>
            <Input
              value={customChapter}
              onChange={(e) => setCustomChapter(e.target.value)}
              placeholder="e.g. Electrostatics Unit, Chapter 5..."
              className="mt-1.5 bg-input border-border"
              data-ocid="reminder.custom_chapter.input"
            />
          </div>
        </>
      )}

      {/* Interval dropdown with 2^x presets */}
      <div>
        <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Remind Every
        </Label>
        <Select value={intervalPreset} onValueChange={setIntervalPreset}>
          <SelectTrigger
            className="mt-1.5 bg-input border-border"
            data-ocid="reminder.interval.select"
          >
            <SelectValue placeholder="Select interval..." />
          </SelectTrigger>
          <SelectContent>
            {INTERVAL_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Show custom number input when "Custom..." is selected */}
        {intervalPreset === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="365"
              value={customIntervalDays}
              onChange={(e) => setCustomIntervalDays(e.target.value)}
              className="bg-input border-border w-28 font-mono"
              placeholder="Days..."
              data-ocid="reminder.custom_interval.input"
            />
            <span className="text-xs text-muted-foreground">days</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 justify-end pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="text-muted-foreground"
          data-ocid="reminder.cancel_button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit}
          className="bg-primary text-primary-foreground"
          data-ocid="reminder.submit_button"
        >
          {addReminder.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

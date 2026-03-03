import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Clock, Plus, RotateCcw } from "lucide-react";
import React, { useState } from "react";
import CustomReminderForm from "../components/CustomReminderForm";
import RevisionList from "../components/RevisionList";
import {
  useGetAllChapters,
  useGetAllRevisionReminders,
  useGetDueForRevision,
  useGetResources,
} from "../hooks/useQueries";

export default function RevisionPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: allReminders = [], isLoading: remindersLoading } =
    useGetAllRevisionReminders();
  const { data: dueReminders = [] } = useGetDueForRevision();
  const { data: chapters = [] } = useGetAllChapters();
  const { data: resources = [] } = useGetResources();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-amber-400" />
            Revision
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Spaced repetition for all your chapters
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Revision Reminder</DialogTitle>
            </DialogHeader>
            <CustomReminderForm onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Due Now
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400">
            {dueReminders.length}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Total Reminders
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-foreground">
            {allReminders.length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="due">
        <TabsList className="bg-muted/50 border border-border mb-4">
          <TabsTrigger
            value="due"
            className="text-xs font-mono data-[state=active]:bg-card"
          >
            Due Now
            {dueReminders.length > 0 && (
              <span className="ml-1.5 bg-amber-400/20 text-amber-400 text-xs px-1.5 py-0.5 rounded-full font-mono">
                {dueReminders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="text-xs font-mono data-[state=active]:bg-card"
          >
            All Reminders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="due">
          {remindersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <RevisionList
              reminders={allReminders}
              chapters={chapters}
              resources={resources}
              showDueOnly
            />
          )}
        </TabsContent>

        <TabsContent value="all">
          {remindersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <RevisionList
              reminders={allReminders}
              chapters={chapters}
              resources={resources}
              showDueOnly={false}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* How it works */}
      <div className="mt-8 bg-card/50 border border-border rounded-lg p-4">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
          How Revision Works
        </h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            • Add a reminder for any chapter with a custom interval (e.g., every
            7 days).
          </p>
          <p>• When the interval passes, the chapter appears in "Due Now".</p>
          <p>
            • Click the ✓ button to mark a chapter as reviewed — this resets the
            timer.
          </p>
          <p>
            • Use short intervals (3–7 days) for weak topics, longer ones (14–30
            days) for strong ones.
          </p>
        </div>
      </div>
    </div>
  );
}

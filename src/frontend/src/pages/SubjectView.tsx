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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Atom,
  Calculator,
  FlaskConical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import type { Resource } from "../backend";
import ChapterList from "../components/ChapterList";
import { useActor } from "../hooks/useActor";
import {
  CHEMISTRY_INORGANIC_CHAPTERS,
  CHEMISTRY_ORGANIC_CHAPTERS,
  CHEMISTRY_PHYSICAL_CHAPTERS,
  useAddResource,
  useDeleteResource,
  useEnsureSubjectChapters,
  useGetChaptersByResource,
  useGetResources,
} from "../hooks/useQueries";

// Global set to track which resource IDs have already been seeded this session
// This prevents duplicate seeding when components remount (e.g. switching tabs)
const globalSeededResources = new Set<string>();

// Global map to store chem branch subset per resource ID before seeding
const globalChemSubsets = new Map<string, string[] | undefined>();

interface SubjectViewProps {
  subject: "Physics" | "Chemistry" | "Maths";
}

const SUBJECT_CONFIG = {
  Physics: {
    icon: Atom,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/30",
    description: "Track your Physics preparation across all resources",
  },
  Chemistry: {
    icon: FlaskConical,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
    description: "Track your Chemistry preparation across all resources",
  },
  Maths: {
    icon: Calculator,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    description: "Track your Mathematics preparation across all resources",
  },
};

// Inner component that handles seeding for a single resource
function ResourceWithSeeding({
  resource,
  subject,
  onDelete,
}: {
  resource: Resource;
  subject: string;
  onDelete: (id: string) => void;
}) {
  const ensureChapters = useEnsureSubjectChapters();
  const { data: _chapters = [], isFetched } = useGetChaptersByResource(
    resource.id,
  );
  const { actor } = useActor();
  const seedingRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ensureChapters intentionally excluded to run only once
  useEffect(() => {
    // Use global set to prevent re-seeding when component remounts (e.g. tab switch)
    if (
      !actor ||
      !isFetched ||
      seedingRef.current ||
      globalSeededResources.has(resource.id) ||
      ensureChapters.isPending
    )
      return;
    seedingRef.current = true;
    globalSeededResources.add(resource.id);
    const chapterSubset = globalChemSubsets.get(resource.id);
    ensureChapters.mutate(
      { resourceId: resource.id, subject, chapterSubset },
      {
        onError: () => {
          // Seeding failed — allow retry by removing from global set
          seedingRef.current = false;
          globalSeededResources.delete(resource.id);
        },
      },
    );
  }, [actor, isFetched, resource.id, subject]);

  return (
    <div className="relative group/resource">
      <ChapterList resource={resource} />
      {ensureChapters.isPending && (
        <div className="absolute top-3 right-10 flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Seeding…</span>
        </div>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="absolute top-3 right-3 opacity-0 group-hover/resource:opacity-100 text-muted-foreground hover:text-red-400 transition-all z-10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{resource.name}"? This will also remove all its chapters.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(resource.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type ChemBranch = "All" | "Physical" | "Inorganic" | "Organic";

const CHEM_BRANCHES: ChemBranch[] = ["All", "Physical", "Inorganic", "Organic"];

export default function SubjectView({ subject }: SubjectViewProps) {
  const config = SUBJECT_CONFIG[subject];
  const Icon = config.icon;

  const { data: allResources = [], isLoading } = useGetResources();
  const addResource = useAddResource();
  const deleteResource = useDeleteResource();

  const [addingResource, setAddingResource] = useState(false);
  const [newResourceName, setNewResourceName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [chemBranch, setChemBranch] = useState<ChemBranch>("All");

  const resources = allResources.filter((r) => r.subject === subject);

  const getChemSubset = (branch: ChemBranch): string[] | undefined => {
    if (branch === "Physical") return CHEMISTRY_PHYSICAL_CHAPTERS;
    if (branch === "Inorganic") return CHEMISTRY_INORGANIC_CHAPTERS;
    if (branch === "Organic") return CHEMISTRY_ORGANIC_CHAPTERS;
    return undefined; // "All" → full list
  };

  const handleAddResource = async () => {
    if (!newResourceName.trim()) return;
    setAddError(null);
    const id = `${subject.toLowerCase()}_${Date.now()}`;
    // Store subset before async so it's available when ResourceWithSeeding mounts
    if (subject === "Chemistry") {
      globalChemSubsets.set(id, getChemSubset(chemBranch));
    }
    try {
      await addResource.mutateAsync({
        id,
        name: newResourceName.trim(),
        subject,
        totalChapters: BigInt(0),
      });
      setNewResourceName("");
      setAddingResource(false);
      setChemBranch("All");
    } catch (err: unknown) {
      globalChemSubsets.delete(id);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Failed to add resource. Please try again.";
      setAddError(message);
    }
  };

  const handleCancelAdd = () => {
    setAddingResource(false);
    setNewResourceName("");
    setAddError(null);
    setChemBranch("All");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className={`w-12 h-12 rounded-xl ${config.bg} ${config.border} border flex items-center justify-center`}
        >
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${config.color}`}>{subject}</h1>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Resources */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {resources.length === 0 && !addingResource && (
            <div className="text-center py-12 text-muted-foreground">
              <Icon
                className={`w-12 h-12 mx-auto mb-3 ${config.color} opacity-30`}
              />
              <p className="text-sm">No resources yet for {subject}.</p>
              <p className="text-xs mt-1">
                Add a resource like "Irodov" or "Black Book" to get started.
              </p>
            </div>
          )}

          {resources.map((resource) => (
            <ResourceWithSeeding
              key={resource.id}
              resource={resource}
              subject={subject}
              onDelete={(id) => deleteResource.mutate(id)}
            />
          ))}

          {/* Add resource form */}
          {addingResource ? (
            <div className="flex flex-col gap-2 p-3 bg-card border border-primary/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Input
                  value={newResourceName}
                  onChange={(e) => {
                    setNewResourceName(e.target.value);
                    if (addError) setAddError(null);
                  }}
                  placeholder="Resource name (e.g. Irodov, Black Book...)"
                  className="flex-1 h-9 text-sm bg-input border-border"
                  autoFocus
                  disabled={addResource.isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddResource();
                    if (e.key === "Escape") handleCancelAdd();
                  }}
                  data-ocid="resources.resource.input"
                />
              </div>

              {/* Chemistry branch selector */}
              {subject === "Chemistry" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-mono">
                    Chapters:
                  </span>
                  {CHEM_BRANCHES.map((branch) => (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => setChemBranch(branch)}
                      data-ocid={`resources.chemistry.branch.${branch.toLowerCase()}.toggle`}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors select-none ${
                        chemBranch === branch
                          ? "bg-violet-400/20 text-violet-300 border-violet-400/50"
                          : "bg-muted/20 text-muted-foreground border-border hover:border-violet-400/30 hover:text-violet-300"
                      }`}
                    >
                      {branch}
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {chemBranch === "All"
                      ? "(all chapters)"
                      : chemBranch === "Physical"
                        ? "(13 chapters)"
                        : chemBranch === "Inorganic"
                          ? "(11 chapters)"
                          : "(11 chapters)"}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAddResource}
                  disabled={!newResourceName.trim() || addResource.isPending}
                  className="bg-primary text-primary-foreground"
                  data-ocid="resources.resource.submit_button"
                >
                  {addResource.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelAdd}
                  disabled={addResource.isPending}
                  data-ocid="resources.resource.cancel_button"
                >
                  Cancel
                </Button>
              </div>

              {addError && (
                <div className="flex items-center gap-2 text-xs text-destructive px-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setAddingResource(true);
                setAddError(null);
              }}
              className="w-full border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              data-ocid="resources.add_resource.button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Resource
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

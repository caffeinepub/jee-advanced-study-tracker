import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Chapter,
  Resource,
  RevisionReminder,
  Task,
  UserProfile,
} from "../backend";
import { useActor } from "./useActor";

// ── Chapter seed lists ────────────────────────────────────────────────────────

export const PHYSICS_CHAPTERS = [
  "Vectors",
  "NLM",
  "Friction",
  "Kinematics",
  "Circular Motion",
  "WPE",
  "COM",
  "Rotational",
  "Fluids",
  "Viscosity and Elasticity",
  "Surface Tension",
  "SHM",
  "Waves",
  "Light Wave",
  "Geometric Optics",
  "KTG",
  "Thermo",
  "Heat Transfer",
  "Calorimetry and Thermal Expansion",
  "Electrostatic",
  "Electric Current",
  "Capacitors",
  "Magnetism",
  "Magnetic Property of Matter",
  "AC",
  "EMI",
  "Photo Electric Effect",
  "Atomic Structure",
  "EM Wave",
  "Nuclear Physics",
  "Gravitation",
  "Error and Analysis",
];

export const CHEMISTRY_PHYSICAL_CHAPTERS = [
  "Mole Concept",
  "Atomic Structure",
  "Gaseous State",
  "Redox Reactions 1",
  "Thermodynamics",
  "Chemical Equilibrium",
  "Ionic Equilibrium",
  "Redox Reactions 2",
  "Surface Chemistry",
  "Kinetics",
  "Solutions",
  "Electrochemistry",
  "Solid State",
];

export const CHEMISTRY_INORGANIC_CHAPTERS = [
  "Chemical Bonding",
  "Periodic Table",
  "Hydrogen",
  "S Block",
  "Noble Gases (P Block)",
  "D Block",
  "P Block 11th",
  "Metallurgy",
  "Coordination Compound",
  "P Block 12th",
  "Salt Analysis",
];

export const CHEMISTRY_ORGANIC_CHAPTERS = [
  "IUPAC",
  "Isomerism",
  "GOC",
  "Reaction Mechanism",
  "OMC",
  "HC",
  "AHC",
  "Alcohol Phenol and Ether",
  "Aldehyde and Ketone",
  "Acid and Derivatives",
  "Amines",
];

export const CHEMISTRY_CHAPTERS = [
  ...CHEMISTRY_PHYSICAL_CHAPTERS,
  ...CHEMISTRY_INORGANIC_CHAPTERS,
  ...CHEMISTRY_ORGANIC_CHAPTERS,
];

export const MATHS_CHAPTERS = [
  "Sets",
  "Sequence and Series",
  "Quadratic Equation",
  "Trigonometry Identities",
  "Trigonometry Equations",
  "Logarithms",
  "Determinant",
  "Straight Lines and Pair of Straight Lines",
  "Circles",
  "PnC",
  "Binomial Theorem",
  "Probability",
  "Complex Numbers",
  "Matrices",
  "Functions",
  "ITF",
  "Limits",
  "C and D",
  "Mod",
  "AOD",
  "Indefinite Integration",
  "Definite Integration",
  "Area",
  "Differential Equations",
  "Vectors",
  "3D Coordinate",
  "Parabola",
  "Hyperbola",
  "Ellipse",
  "Functional Equations",
];

export const SUBJECT_CHAPTER_MAP: Record<string, string[]> = {
  Physics: PHYSICS_CHAPTERS,
  Chemistry: CHEMISTRY_CHAPTERS,
  Maths: MATHS_CHAPTERS,
};

// ── User Profile ──────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
    retryDelay: 1000,
  });

  return {
    ...query,
    // isLoading is true only while the actor is fetching AND query hasn't resolved
    isLoading:
      (actorFetching && !query.isFetched) || (!!actor && query.isLoading),
    // isFetched: true once the query has settled (success or error), regardless of actor state
    isFetched: query.isFetched || query.isError,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ── Resources ─────────────────────────────────────────────────────────────────

export function useGetResources() {
  const { actor, isFetching } = useActor();

  return useQuery<Resource[]>({
    queryKey: ["resources"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getResources();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddResource() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (params: {
      id: string;
      name: string;
      subject: string;
      totalChapters: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addResource(
        params.id,
        params.name,
        params.subject,
        params.totalChapters,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}

export function useDeleteResource() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteResource(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    },
  });
}

// ── Chapters ──────────────────────────────────────────────────────────────────

export function useGetAllChapters() {
  const { actor, isFetching } = useActor();

  return useQuery<Chapter[]>({
    queryKey: ["chapters", "all"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllChapters();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetChaptersByResource(resourceId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Chapter[]>({
    queryKey: ["chapters", resourceId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getChaptersByResource(resourceId);
    },
    enabled: !!actor && !isFetching && !!resourceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddChapter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (params: {
      id: string;
      resourceId: string;
      name: string;
      totalQuestions?: bigint;
      doneQuestions?: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addChapter(
        params.id,
        params.resourceId,
        params.name,
        params.totalQuestions ?? BigInt(0),
        params.doneQuestions ?? BigInt(0),
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chapters", variables.resourceId],
      });
      queryClient.invalidateQueries({ queryKey: ["chapters", "all"] });
    },
  });
}

export function useUpdateChapterQuestions() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (params: {
      chapterId: string;
      doneQuestions: bigint;
      totalQuestions: bigint;
      resourceId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateChapterQuestions(
        params.chapterId,
        params.doneQuestions,
        params.totalQuestions,
      );
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        queryKey: ["chapters", variables.resourceId],
      });
      await queryClient.cancelQueries({ queryKey: ["chapters", "all"] });

      // Snapshot previous values for rollback
      const previousByResource = queryClient.getQueryData<Chapter[]>([
        "chapters",
        variables.resourceId,
      ]);
      const previousAll = queryClient.getQueryData<Chapter[]>([
        "chapters",
        "all",
      ]);

      // Apply optimistic update to per-resource cache
      if (previousByResource) {
        queryClient.setQueryData<Chapter[]>(
          ["chapters", variables.resourceId],
          previousByResource.map((ch) =>
            ch.id === variables.chapterId
              ? {
                  ...ch,
                  doneQuestions: variables.doneQuestions,
                  totalQuestions: variables.totalQuestions,
                }
              : ch,
          ),
        );
      }

      // Apply optimistic update to all-chapters cache
      if (previousAll) {
        queryClient.setQueryData<Chapter[]>(
          ["chapters", "all"],
          previousAll.map((ch) =>
            ch.id === variables.chapterId
              ? {
                  ...ch,
                  doneQuestions: variables.doneQuestions,
                  totalQuestions: variables.totalQuestions,
                }
              : ch,
          ),
        );
      }

      return { previousByResource, previousAll };
    },
    onError: (_err, variables, context) => {
      // Roll back on error
      if (context?.previousByResource !== undefined) {
        queryClient.setQueryData(
          ["chapters", variables.resourceId],
          context.previousByResource,
        );
      }
      if (context?.previousAll !== undefined) {
        queryClient.setQueryData(["chapters", "all"], context.previousAll);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chapters", variables.resourceId],
      });
      queryClient.invalidateQueries({ queryKey: ["chapters", "all"] });
    },
  });
}

export function useUpdateChapterStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (params: {
      chapterId: string;
      status: string;
      resourceId?: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateChapterStatus(params.chapterId, params.status);
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      if (variables.resourceId) {
        await queryClient.cancelQueries({
          queryKey: ["chapters", variables.resourceId],
        });
      }
      await queryClient.cancelQueries({ queryKey: ["chapters", "all"] });

      // Snapshot previous values for rollback
      const previousByResource = variables.resourceId
        ? queryClient.getQueryData<Chapter[]>([
            "chapters",
            variables.resourceId,
          ])
        : undefined;
      const previousAll = queryClient.getQueryData<Chapter[]>([
        "chapters",
        "all",
      ]);

      // Apply optimistic update to per-resource cache
      if (previousByResource && variables.resourceId) {
        queryClient.setQueryData<Chapter[]>(
          ["chapters", variables.resourceId],
          previousByResource.map((ch) =>
            ch.id === variables.chapterId
              ? { ...ch, status: variables.status }
              : ch,
          ),
        );
      }

      // Apply optimistic update to all-chapters cache
      if (previousAll) {
        queryClient.setQueryData<Chapter[]>(
          ["chapters", "all"],
          previousAll.map((ch) =>
            ch.id === variables.chapterId
              ? { ...ch, status: variables.status }
              : ch,
          ),
        );
      }

      return { previousByResource, previousAll };
    },
    onError: (_err, variables, context) => {
      // Roll back on error
      if (context?.previousByResource !== undefined && variables.resourceId) {
        queryClient.setQueryData(
          ["chapters", variables.resourceId],
          context.previousByResource,
        );
      }
      if (context?.previousAll !== undefined) {
        queryClient.setQueryData(["chapters", "all"], context.previousAll);
      }
    },
    onSettled: (_data, _err, variables) => {
      if (variables.resourceId) {
        queryClient.invalidateQueries({
          queryKey: ["chapters", variables.resourceId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["chapters", "all"] });
    },
  });
}

export function useDeleteChapter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (params: { chapterId: string; resourceId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteChapter(params.chapterId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chapters", variables.resourceId],
      });
      queryClient.invalidateQueries({ queryKey: ["chapters", "all"] });
    },
  });
}

// ── Chapter Seeding ───────────────────────────────────────────────────────────

/**
 * Ensures all standard chapters for a given subject exist on a resource.
 * Only adds chapters that are missing (by name); never overwrites existing data.
 */
export function useEnsureSubjectChapters() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (params: {
      resourceId: string;
      subject: string;
      chapterSubset?: string[];
    }) => {
      if (!actor) throw new Error("Actor not available");

      const standardChapters =
        params.chapterSubset ?? SUBJECT_CHAPTER_MAP[params.subject];
      if (!standardChapters) return;

      // Fetch existing chapters for this resource
      const existing = await actor.getChaptersByResource(params.resourceId);
      const existingNames = new Set(existing.map((c) => c.name));

      // Add only missing chapters sequentially to preserve order
      for (const chapterName of standardChapters) {
        if (!existingNames.has(chapterName)) {
          const id = `${params.resourceId}_${chapterName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          await actor.addChapter(
            id,
            params.resourceId,
            chapterName,
            BigInt(0),
            BigInt(0),
          );
        }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chapters", variables.resourceId],
      });
      queryClient.invalidateQueries({ queryKey: ["chapters", "all"] });
    },
  });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function useGetTasks(filterStatus?: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Task[]>({
    queryKey: ["tasks", filterStatus ?? "all"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTasks(filterStatus ?? null);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (params: {
      title: string;
      description: string;
      subjectTag: string;
      dueDate: bigint | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createTask(
        params.title,
        params.description,
        params.subjectTag,
        params.dueDate,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (params: {
      taskId: string;
      title: string;
      description: string;
      subjectTag: string;
      dueDate: bigint | null;
      status: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateTask(
        params.taskId,
        params.title,
        params.description,
        params.subjectTag,
        params.dueDate,
        params.status,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (taskId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ── Revision ──────────────────────────────────────────────────────────────────

export function useGetAllRevisionReminders() {
  const { actor, isFetching } = useActor();

  return useQuery<RevisionReminder[]>({
    queryKey: ["revisionReminders", "all"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRevisionReminders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDueForRevision() {
  const { actor, isFetching } = useActor();

  return useQuery<RevisionReminder[]>({
    queryKey: ["revisionReminders", "due"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDueForRevision();
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 2, // 2 min — changes based on real time
  });
}

export function useAddRevisionReminder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (params: {
      id: string;
      resourceId: string;
      chapterId: string;
      intervalDays: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addRevisionReminder(
        params.id,
        params.resourceId,
        params.chapterId,
        params.intervalDays,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisionReminders"] });
    },
  });
}

export function useMarkRevisionComplete() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (reminderId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.markRevisionComplete(reminderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisionReminders"] });
    },
  });
}

export function useDeleteRevisionReminder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (reminderId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteRevisionReminder(reminderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisionReminders"] });
    },
  });
}

// ── Study Timer / Leaderboard ─────────────────────────────────────────────────

export function useGetTodayLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<
    Array<{ totalSeconds: bigint; name: string; principalText: string }>
  >({
    queryKey: ["leaderboard", "today"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTodayLeaderboard();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 0, // always re-fetch when switching to timer page — data must be fresh
  });
}

export function useGetMyTodaySeconds() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["studyTime", "today"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getMyTodaySeconds();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0, // timer data must always be fresh
  });
}

export function useRecordStudyTime() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    retry: 2,
    retryDelay: 1500,
    mutationFn: async (seconds: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.recordStudyTime(seconds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studyTime"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

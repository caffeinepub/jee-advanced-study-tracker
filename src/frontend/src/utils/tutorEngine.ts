// Pure rule-based tutor engine that analyses study data and produces recommendations

import type { Chapter, Resource, RevisionReminder, Task } from "../backend";

export interface TutorRecommendation {
  id: string;
  type: "urgent" | "focus" | "insight" | "plan" | "motivation";
  title: string;
  body: string;
  subject?: "Physics" | "Chemistry" | "Maths" | "General";
  actionLabel?: string;
  actionPath?: string;
  priority: number; // higher = more important, used for sorting
}

export interface DailyPlan {
  totalDaysLeft: number;
  chaptersLeft: number;
  targetPerDay: number;
  todayFocus: { subject: string; count: number; reason: string }[];
}

const JEE_DATE = new Date("2026-05-17T00:00:00");

export function getDaysToJEE(): number {
  const now = new Date();
  const diff = JEE_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function generateRecommendations(
  chapters: Chapter[],
  resources: Resource[],
  _reminders: RevisionReminder[],
  tasks: Task[],
  dueRevisions: RevisionReminder[],
): TutorRecommendation[] {
  const recommendations: TutorRecommendation[] = [];
  const daysLeft = getDaysToJEE();

  const subjects = ["Physics", "Chemistry", "Maths"] as const;

  // Subject completion stats
  const subjectStats = subjects.map((subject) => {
    const subjectResources = resources.filter((r) => r.subject === subject);
    const subjectChapters = chapters.filter((c) =>
      subjectResources.some((r) => r.id === c.resourceId),
    );
    const done = subjectChapters.filter((c) => c.status === "Done").length;
    const inProgress = subjectChapters.filter(
      (c) => c.status === "In Progress",
    ).length;
    const notStarted = subjectChapters.filter(
      (c) => c.status === "Not Started",
    ).length;
    const total = subjectChapters.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      subject,
      done,
      inProgress,
      notStarted,
      total,
      pct,
      subjectResources,
      subjectChapters,
    };
  });

  // 1. URGENT: Due revisions
  if (dueRevisions.length > 0) {
    recommendations.push({
      id: "due-revisions",
      type: "urgent",
      title: `${dueRevisions.length} revision${dueRevisions.length > 1 ? "s" : ""} overdue`,
      body: `You have ${dueRevisions.length} chapter${dueRevisions.length > 1 ? "s" : ""} due for revision today. Clear these before starting new topics to retain what you've already studied.`,
      subject: "General",
      actionLabel: "Go to Revision",
      actionPath: "/revision",
      priority: 100,
    });
  }

  // 2. FOCUS: Chapters In Progress (unfinished business)
  const inProgressChapters = chapters.filter((c) => c.status === "In Progress");
  if (inProgressChapters.length > 3) {
    recommendations.push({
      id: "too-many-in-progress",
      type: "focus",
      title: `${inProgressChapters.length} chapters left hanging`,
      body: `You have ${inProgressChapters.length} chapters marked "In Progress". Focus on finishing these before starting new ones — incomplete chapters don't count toward your progress.`,
      subject: "General",
      priority: 90,
    });
  } else if (inProgressChapters.length > 0) {
    const names = inProgressChapters
      .slice(0, 3)
      .map((c) => c.name)
      .join(", ");
    recommendations.push({
      id: "finish-in-progress",
      type: "focus",
      title: "Finish what you started",
      body: `${names}${inProgressChapters.length > 3 ? " and more" : ""} — ${inProgressChapters.length} chapter${inProgressChapters.length > 1 ? "s are" : " is"} in progress. Push to completion before moving on.`,
      subject: "General",
      priority: 85,
    });
  }

  // 3. PLAN: Daily target
  const totalChapters = chapters.length;
  const doneChapters = chapters.filter((c) => c.status === "Done").length;
  const remaining = totalChapters - doneChapters;
  if (daysLeft > 0 && remaining > 0) {
    const perDay = Math.ceil(remaining / daysLeft);
    recommendations.push({
      id: "daily-target",
      type: "plan",
      title: `Target: ${perDay} chapter${perDay > 1 ? "s" : ""} per day`,
      body: `${remaining} chapters remain across all subjects. With ${daysLeft} days to JEE Advanced, you need to complete roughly ${perDay} chapter${perDay > 1 ? "s" : ""} per day to cover everything.`,
      subject: "General",
      priority: 80,
    });
  }

  // 4. INSIGHT: Per-subject weak areas
  const sortedByProgress = [...subjectStats].sort((a, b) => a.pct - b.pct);
  const weakest = sortedByProgress[0];
  if (weakest && weakest.pct < 30 && weakest.total > 0) {
    const notStartedChapters = weakest.subjectChapters.filter(
      (c) => c.status === "Not Started",
    );
    const suggestion =
      notStartedChapters.length > 0
        ? notStartedChapters[0].name
        : "any chapter";
    recommendations.push({
      id: `weak-subject-${weakest.subject}`,
      type: "focus",
      title: `${weakest.subject} needs attention (${weakest.pct}%)`,
      body: `${weakest.subject} is your least completed subject. Start with "${suggestion}" to build momentum. Even 1-2 chapters per day makes a big difference.`,
      subject: weakest.subject as "Physics" | "Chemistry" | "Maths",
      actionLabel: `Go to ${weakest.subject}`,
      actionPath: `/${weakest.subject.toLowerCase()}`,
      priority: 75,
    });
  }

  // 5. MOTIVATION: Near completion subject
  const nearDone = subjectStats.filter((s) => s.pct >= 70 && s.pct < 100);
  for (const s of nearDone) {
    recommendations.push({
      id: `near-done-${s.subject}`,
      type: "motivation",
      title: `${s.subject} is ${s.pct}% done — push to finish!`,
      body: `Only ${s.notStarted + s.inProgress} chapters left in ${s.subject}. You're close — completing this subject will boost your confidence and free up revision time.`,
      subject: s.subject as "Physics" | "Chemistry" | "Maths",
      actionLabel: `Go to ${s.subject}`,
      actionPath: `/${s.subject.toLowerCase()}`,
      priority: 70,
    });
  }

  // 6. INSIGHT: No activity (everything not started)
  for (const s of subjectStats) {
    if (s.total > 0 && s.done === 0 && s.inProgress === 0) {
      recommendations.push({
        id: `not-started-${s.subject}`,
        type: "insight",
        title: `${s.subject}: not started yet`,
        body: `No chapters marked done in ${s.subject}. Pick one resource and start with chapter 1 — getting the first chapter done is the hardest part.`,
        subject: s.subject as "Physics" | "Chemistry" | "Maths",
        actionLabel: `Open ${s.subject}`,
        actionPath: `/${s.subject.toLowerCase()}`,
        priority: 65,
      });
    }
  }

  // 7. PLAN: Today's tasks
  const pendingTodayTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "Done") return false;
    const due = new Date(Number(t.dueDate) / 1_000_000);
    return due.toDateString() === new Date().toDateString();
  });
  if (pendingTodayTasks.length > 0) {
    recommendations.push({
      id: "today-tasks",
      type: "plan",
      title: `${pendingTodayTasks.length} task${pendingTodayTasks.length > 1 ? "s" : ""} due today`,
      body: `You have ${pendingTodayTasks.length} task${pendingTodayTasks.length > 1 ? "s" : ""} scheduled for today. Check your Tasks page and work through them.`,
      subject: "General",
      actionLabel: "View Tasks",
      actionPath: "/todo",
      priority: 60,
    });
  }

  // 8. MOTIVATION: Days left urgency
  if (daysLeft <= 30 && daysLeft > 0) {
    recommendations.push({
      id: "countdown-urgency",
      type: "urgent",
      title: `${daysLeft} days to JEE Advanced — final stretch`,
      body: `You're in the final month. Focus exclusively on revision and weak topics. Stop starting new things — lock down what you know and make it bulletproof.`,
      subject: "General",
      priority: 95,
    });
  } else if (daysLeft <= 60) {
    recommendations.push({
      id: "countdown-warning",
      type: "focus",
      title: `${daysLeft} days left — time to accelerate`,
      body: "2 months to go. Finish any remaining chapters quickly and shift more time to revision. Quality over quantity now.",
      subject: "General",
      priority: 72,
    });
  }

  // 9. If everything is great
  if (
    recommendations.length === 0 ||
    (dueRevisions.length === 0 && inProgressChapters.length === 0)
  ) {
    const overallPct =
      totalChapters > 0 ? Math.round((doneChapters / totalChapters) * 100) : 0;
    if (overallPct >= 50) {
      recommendations.push({
        id: "great-progress",
        type: "motivation",
        title: `${overallPct}% done — great work!`,
        body: `You're over halfway through your syllabus. Keep the momentum going and don't skip revision sessions.`,
        subject: "General",
        priority: 50,
      });
    }
  }

  // 10. NEW: Weak subject detection — if one subject is 15%+ behind others
  const subjectsWithData = subjectStats.filter((s) => s.total > 0);
  if (subjectsWithData.length >= 2) {
    const avgPct =
      subjectsWithData.reduce((sum, s) => sum + s.pct, 0) /
      subjectsWithData.length;
    for (const s of subjectsWithData) {
      if (avgPct - s.pct > 15 && s.pct < 50) {
        // Only add if not already covered by weakest subject
        const alreadyAdded = recommendations.some(
          (r) => r.id === `weak-subject-${s.subject}`,
        );
        if (!alreadyAdded) {
          recommendations.push({
            id: `behind-subject-${s.subject}`,
            type: "urgent",
            title: `${s.subject} is falling behind (${s.pct}% vs avg ${Math.round(avgPct)}%)`,
            body: `${s.subject} is more than 15% behind your average progress. Dedicate extra sessions this week to close the gap — imbalanced prep hurts JEE scores.`,
            subject: s.subject as "Physics" | "Chemistry" | "Maths",
            actionLabel: `Focus on ${s.subject}`,
            actionPath: "/resources",
            priority: 88,
          });
        }
        break; // Only highlight the most behind subject
      }
    }
  }

  // 11. NEW: Question progress tracking — aggregate across all chapters with Q targets
  const chaptersWithQ = chapters.filter((c) => Number(c.totalQuestions) > 0);
  if (chaptersWithQ.length > 0) {
    const totalQ = chaptersWithQ.reduce(
      (sum, c) => sum + Number(c.totalQuestions),
      0,
    );
    const doneQ = chaptersWithQ.reduce(
      (sum, c) => sum + Number(c.doneQuestions),
      0,
    );
    const qPct = totalQ > 0 ? Math.round((doneQ / totalQ) * 100) : 0;
    const remainingQ = totalQ - doneQ;

    if (qPct < 100 && totalQ > 0) {
      const perDayQ =
        daysLeft > 0 ? Math.ceil(remainingQ / daysLeft) : remainingQ;
      recommendations.push({
        id: "question-progress",
        type: "plan",
        title: `Questions: ${qPct}% solved (${doneQ}/${totalQ})`,
        body: `You've solved ${doneQ} out of ${totalQ} tracked questions across ${chaptersWithQ.length} chapters. To finish by JEE, aim for ~${perDayQ} question${perDayQ > 1 ? "s" : ""} per day.`,
        subject: "General",
        priority: 78,
      });
    } else if (qPct === 100) {
      recommendations.push({
        id: "questions-complete",
        type: "motivation",
        title: "All tracked questions solved!",
        body: `You've completed all ${totalQ} tracked questions. Consider adding more questions or moving to revision mode.`,
        subject: "General",
        priority: 55,
      });
    }
  }

  // 12. NEW: Momentum / cold-start detection — no progress at all
  const hasAnyProgress = chapters.some(
    (c) => c.status === "Done" || c.status === "In Progress",
  );
  if (chapters.length > 0 && !hasAnyProgress) {
    recommendations.push({
      id: "cold-start-motivation",
      type: "motivation",
      title: "Start your JEE journey today",
      body: `You've set up your resources but haven't marked any chapters yet. Open one resource, pick the first chapter, and mark it "In Progress" — momentum builds from the first step.`,
      subject: "General",
      actionLabel: "Open Resources",
      actionPath: "/resources",
      priority: 68,
    });
  }

  // Sort by priority descending
  return recommendations.sort((a, b) => b.priority - a.priority);
}

export function generateDailyPlan(
  chapters: Chapter[],
  resources: Resource[],
  _dueRevisions: RevisionReminder[],
): DailyPlan {
  const daysLeft = getDaysToJEE();
  const subjects = ["Physics", "Chemistry", "Maths"] as const;

  const totalChapters = chapters.length;
  const doneChapters = chapters.filter((c) => c.status === "Done").length;
  const remaining = totalChapters - doneChapters;
  const targetPerDay =
    daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;

  const todayFocus = subjects.map((subject) => {
    const subjectResources = resources.filter((r) => r.subject === subject);
    const subjectChapters = chapters.filter((c) =>
      subjectResources.some((r) => r.id === c.resourceId),
    );
    const done = subjectChapters.filter((c) => c.status === "Done").length;
    const inProgress = subjectChapters.filter(
      (c) => c.status === "In Progress",
    ).length;
    const total = subjectChapters.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    // Allocate more focus to weaker subjects
    const weight = pct < 30 ? 3 : pct < 60 ? 2 : 1;
    const count = Math.max(1, Math.ceil((targetPerDay * weight) / 6));

    let reason = "";
    if (inProgress > 0)
      reason = `${inProgress} in-progress chapter${inProgress > 1 ? "s" : ""} to finish`;
    else if (pct < 30) reason = "weakest subject — needs priority";
    else if (pct < 60) reason = "building momentum";
    else reason = "maintain progress";

    return { subject, count, reason };
  });

  return {
    totalDaysLeft: daysLeft,
    chaptersLeft: remaining,
    targetPerDay,
    todayFocus,
  };
}

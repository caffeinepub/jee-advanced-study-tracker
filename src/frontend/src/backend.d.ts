import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Task {
    id: string;
    status: string;
    title: string;
    dueDate?: bigint;
    description: string;
    subjectTag: string;
}
export interface RevisionReminder {
    id: string;
    lastReviewed: bigint;
    resourceId: string;
    chapterId: string;
    intervalDays: bigint;
}
export interface Resource {
    id: string;
    subject: string;
    name: string;
    totalChapters: bigint;
}
export interface Chapter {
    id: string;
    status: string;
    resourceId: string;
    name: string;
    doneQuestions: bigint;
    totalQuestions: bigint;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addChapter(id: string, resourceId: string, name: string, totalQuestions: bigint, doneQuestions: bigint): Promise<void>;
    addResource(id: string, name: string, subject: string, totalChapters: bigint): Promise<void>;
    addRevisionReminder(id: string, resourceId: string, chapterId: string, intervalDays: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createTask(title: string, description: string, subjectTag: string, dueDate: bigint | null): Promise<string>;
    deleteChapter(chapterId: string): Promise<void>;
    deleteResource(id: string): Promise<void>;
    deleteRevisionReminder(reminderId: string): Promise<void>;
    deleteTask(taskId: string): Promise<void>;
    getAllChapters(): Promise<Array<Chapter>>;
    getAllRevisionReminders(): Promise<Array<RevisionReminder>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChaptersByResource(resourceId: string): Promise<Array<Chapter>>;
    getDueForRevision(): Promise<Array<RevisionReminder>>;
    getMyTodaySeconds(): Promise<bigint>;
    getResources(): Promise<Array<Resource>>;
    getTasks(filterStatus: string | null): Promise<Array<Task>>;
    getTodayLeaderboard(): Promise<Array<{
        totalSeconds: bigint;
        name: string;
        principalText: string;
    }>>;
    getTotalChapterCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    markRevisionComplete(reminderId: string): Promise<void>;
    recordStudyTime(seconds: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateChapterQuestions(chapterId: string, doneQuestions: bigint, totalQuestions: bigint): Promise<void>;
    updateChapterStatus(chapterId: string, status: string): Promise<void>;
    updateResource(id: string, name: string, subject: string, totalChapters: bigint): Promise<void>;
    updateTask(taskId: string, title: string, description: string, subjectTag: string, dueDate: bigint | null, status: string): Promise<void>;
}

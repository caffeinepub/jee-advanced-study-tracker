import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type React from "react";
import Layout from "./components/Layout";
import { RealityModeProvider } from "./contexts/RealityModeContext";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PlannerPage from "./pages/PlannerPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import ResourcesPage from "./pages/ResourcesPage";
import RevisionPage from "./pages/RevisionPage";
import TimerPage from "./pages/TimerPage";
import TodoPage from "./pages/TodoPage";

// ── Auth Gate ─────────────────────────────────────────────────────────────────

function AuthGate({ children }: { children: React.ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;
  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-mono">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => {}} />;
  }

  if (showProfileSetup) {
    return <ProfileSetupPage onComplete={() => {}} />;
  }

  if (profileLoading && !isFetched) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-mono">Loading profile...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Root Layout ───────────────────────────────────────────────────────────────

function RootLayout() {
  return (
    <RealityModeProvider>
      <AuthGate>
        <Layout>
          <Outlet />
        </Layout>
      </AuthGate>
    </RealityModeProvider>
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const resourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/resources",
  component: ResourcesPage,
});

const todoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/todo",
  component: TodoPage,
});

const revisionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/revision",
  component: RevisionPage,
});

const timerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/timer",
  component: TimerPage,
});

const plannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/planner",
  component: PlannerPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  resourcesRoute,
  todoRoute,
  revisionRoute,
  timerRoute,
  plannerRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return <RouterProvider router={router} />;
}

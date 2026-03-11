import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import React from "react";
import Layout from "./components/Layout";
import { RealityModeProvider } from "./contexts/RealityModeContext";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PlannerPage from "./pages/PlannerPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import ResourcesPage from "./pages/ResourcesPage";
import TimerPage from "./pages/TimerPage";
import TodoPage from "./pages/TodoPage";

// ── Auth Gate ─────────────────────────────────────────────────────────────────

function AuthGate({ children }: { children: React.ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    isError: profileError,
  } = useGetCallerUserProfile();

  // One-shot 10-second timeout: once fired it never resets, so transient
  // refetch oscillations cannot keep the loading screen alive indefinitely.
  const [loadingTimedOut, setLoadingTimedOut] = React.useState(false);
  React.useEffect(() => {
    // Never start a new timer if we already timed out, or if not loading
    if (loadingTimedOut || !profileLoading) return;
    const t = setTimeout(() => setLoadingTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [profileLoading, loadingTimedOut]);

  const isAuthenticated = !!identity;
  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    isFetched &&
    userProfile === null &&
    !profileError;

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

  // Only block on the loading screen if we haven't timed out or errored
  if (profileLoading && !isFetched && !loadingTimedOut && !profileError) {
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

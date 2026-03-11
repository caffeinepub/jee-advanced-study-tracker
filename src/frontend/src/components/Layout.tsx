import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Timer,
  Zap,
  ZapOff,
} from "lucide-react";
import type React from "react";
import { useRealityMode } from "../contexts/RealityModeContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import { Link, useLocation } from "../hooks/useRouter";
import GoalsTrackerBar from "./GoalsTrackerBar";
import RealityModeOverlay from "./RealityModeOverlay";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { path: "/" as const, label: "Dashboard", icon: LayoutDashboard },
  { path: "/resources" as const, label: "Resources", icon: BookOpen },
  { path: "/todo" as const, label: "Tasks", icon: CheckSquare },
  { path: "/timer" as const, label: "Timer", icon: Timer },
  { path: "/planner" as const, label: "Planner", icon: CalendarDays },
];

export default function Layout({ children }: LayoutProps) {
  const { isRealityModeActive, toggleRealityMode } = useRealityMode();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: profile } = useGetCallerUserProfile();
  const location = useLocation();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Chapter goals bar only — JEE countdown bar removed */}
        <GoalsTrackerBar />

        {/* Header */}
        <header className="bg-card/80 border-b border-border backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center min-h-12 px-4 gap-2 flex-wrap py-1">
            {/* Nav */}
            <nav className="flex items-center gap-0.5 flex-1 min-w-0">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                        data-ocid={`nav.${item.label.toLowerCase()}.link`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden md:inline">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent className="md:hidden">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleRealityMode}
                    className={`h-8 w-8 ${
                      isRealityModeActive
                        ? "text-red-400 bg-red-400/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isRealityModeActive ? (
                      <ZapOff className="w-4 h-4" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isRealityModeActive ? "Exit Reality Mode" : "Reality Mode"}
                  </p>
                </TooltipContent>
              </Tooltip>

              {profile && (
                <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                  {profile.name}
                </span>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/40 py-3 px-4">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>Built with</span>
            <span className="text-red-400">♥</span>
            <span>using</span>
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || "jee-command")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              caffeine.ai
            </a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </footer>

        <RealityModeOverlay />
      </div>
    </TooltipProvider>
  );
}

import { Button } from "@/components/ui/button";
import { Loader2, Lock, Zap } from "lucide-react";
import React from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const { login, loginStatus, identity, isInitializing } =
    useInternetIdentity();

  const isLoggingIn = loginStatus === "logging-in";
  const isAuthenticated = !!identity;

  React.useEffect(() => {
    if (isAuthenticated) {
      onLogin();
    }
  }, [isAuthenticated, onLogin]);

  const handleLogin = () => {
    try {
      login();
    } catch {
      // handled by loginStatus
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.78 0.18 55) 1px, transparent 1px), linear-gradient(90deg, oklch(0.78 0.18 55) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 shadow-glow">
            <img
              src="/assets/generated/logo-mark.dim_128x128.png"
              alt="JEE Tracker"
              className="w-10 h-10 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-sans">
            JEE<span className="text-primary"> Command</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            Advanced Study Tracker
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border mb-4">
                <Lock className="w-3 h-3" />
                SECURE ACCESS
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Sign in to continue
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Use Internet Identity to access your study tracker
              </p>
            </div>

            {loginStatus === "loginError" && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-red-400">
                Login failed. Please try again.
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={isLoggingIn || isInitializing}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11"
            >
              {isLoggingIn || isInitializing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isInitializing ? "Initializing..." : "Connecting..."}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Login with Internet Identity
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your data is stored securely on the Internet Computer blockchain.
            </p>
          </div>
        </div>

        {/* Stats teaser */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Physics", color: "text-sky-400" },
            { label: "Chemistry", color: "text-violet-400" },
            { label: "Maths", color: "text-amber-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card/50 border border-border rounded-md p-3 text-center"
            >
              <div className={`text-xs font-mono font-semibold ${s.color}`}>
                {s.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Track progress
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

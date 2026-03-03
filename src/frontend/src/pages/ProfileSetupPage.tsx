import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useSaveCallerUserProfile } from "../hooks/useQueries";

interface ProfileSetupPageProps {
  onComplete: () => void;
}

export default function ProfileSetupPage({
  onComplete,
}: ProfileSetupPageProps) {
  const [name, setName] = useState("");
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await saveProfile.mutateAsync({ name: name.trim() });
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-6">
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
              <User className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Set up your profile</h2>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              What should we call you?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Your name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arjun"
                className="mt-1.5 bg-input border-border"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={!name.trim() || saveProfile.isPending}
              className="w-full bg-primary text-primary-foreground"
            >
              {saveProfile.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Get Started →"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

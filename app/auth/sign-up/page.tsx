"use client";

import { useState } from "react";
import { AuthForm } from "@/components/auth";

export default function SignUp() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 font-bold text-2xl">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs">
              C
            </div>
            <span>Convex Auth</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <AuthForm mode={mode} onModeChange={setMode} />
        </div>
      </div>
    </div>
  );
}

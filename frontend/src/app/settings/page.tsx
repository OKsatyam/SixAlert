"use client";
// Settings page — auth-protected notification preferences (UI only, Phase 10)
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Settings, Bell, Mail, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
}

function ToggleRow({ icon, title, description, checked }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-zinc-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-orange-400">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">{title}</p>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
      </div>
      {/* visual-only toggle */}
      <div
        className={cn(
          "w-11 h-6 rounded-full relative cursor-not-allowed transition-colors",
          checked ? "bg-orange-500/40" : "bg-zinc-700"
        )}
      >
        <div
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-zinc-300 transition-transform",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { token, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [isLoading, token, router]);

  if (isLoading || (!token && !isLoading)) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-orange-500" size={22} />
        <h1 className="font-display text-3xl tracking-wide">SETTINGS</h1>
      </div>

      {/* account section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">Account</h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <span className="font-display text-lg text-orange-400">
              {user?.name?.[0] ?? "?"}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">{user?.name}</p>
            <p className="text-xs text-zinc-400">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* notifications section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2">
          Notifications
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          Get alerted the moment a six is hit during a live match
        </p>
        <ToggleRow
          icon={<Bell size={16} />}
          title="Web Push"
          description="Browser push notifications"
          checked={true}
        />
        <ToggleRow
          icon={<Mail size={16} />}
          title="Email"
          description="Deal alerts to your email"
          checked={false}
        />
      </div>

      {/* save button — disabled until Phase 10 */}
      <div className="flex items-center gap-3">
        <Button disabled className="opacity-40 cursor-not-allowed">
          Save Preferences
        </Button>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Lock size={12} />
          Coming in Phase 10
        </div>
      </div>
    </div>
  );
}

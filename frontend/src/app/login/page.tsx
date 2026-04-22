"use client";
// Login page — JWT stored in localStorage on success
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(data.token, data.user);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-orange-500 items-center justify-center mb-4">
            <span className="text-white font-display text-2xl">6</span>
          </div>
          <h1 className="font-display text-3xl tracking-wide text-white">WELCOME BACK</h1>
          <p className="text-zinc-400 text-sm mt-1">Sign in to catch your sixes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          No account?{" "}
          <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium">
            Create one
          </Link>
        </p>

        {/* dev hint */}
        <div className="mt-6 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-500">
          <p className="font-medium text-zinc-400 mb-1">Test accounts:</p>
          <p>Admin: admin@sixalert.com / Admin@123456</p>
          <p>User: user@sixalert.com / User@123456</p>
        </div>
      </div>
    </div>
  );
}

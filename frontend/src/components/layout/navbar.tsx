"use client";
// Top navigation bar — fixed, dark with orange accent
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Zap, LayoutGrid, CalendarDays, History, Settings, ShieldCheck, LogOut } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Live", icon: Zap },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/brands", label: "Brands", icon: LayoutGrid },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-md bg-orange-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm leading-none">6</span>
          </div>
          <span className="font-display text-xl text-white tracking-wide">
            SIX<span className="text-orange-500">ALERT</span>
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-zinc-800 text-orange-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === "/admin"
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              )}
            >
              <ShieldCheck size={14} />
              Admin
            </Link>
          )}
        </nav>

        {/* right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-zinc-400">{user.name}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}

          {/* mobile hamburger */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={cn("h-0.5 bg-current transition-transform", mobileOpen && "translate-y-[7px] rotate-45")} />
              <span className={cn("h-0.5 bg-current transition-opacity", mobileOpen && "opacity-0")} />
              <span className={cn("h-0.5 bg-current transition-transform", mobileOpen && "-translate-y-[7px] -rotate-45")} />
            </div>
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
                pathname === href ? "bg-zinc-800 text-orange-400" : "text-zinc-400"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-zinc-400">
              <ShieldCheck size={15} />Admin
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

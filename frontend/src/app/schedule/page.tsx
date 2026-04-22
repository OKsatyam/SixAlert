"use client";
// Schedule page — shows all matches, filterable by status
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import type { Match } from "@/types";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "live" | "scheduled" | "completed";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SchedulePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Match[]>("/matches")
      .then(setMatches)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? matches : matches.filter((m) => m.status === filter);

  const filters: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Live", value: "live" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="text-orange-500" size={22} />
        <h1 className="font-display text-3xl tracking-wide">MATCH SCHEDULE</h1>
      </div>

      {/* filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
              filter === value
                ? "bg-orange-500 border-orange-500 text-white"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-orange-500 animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
          <p>No {filter !== "all" ? filter : ""} matches found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((match) => (
          <div
            key={match._id}
            className={cn(
              "rounded-xl border bg-zinc-900 p-5 transition-colors",
              match.status === "live"
                ? "border-orange-500/40 bg-zinc-900/80"
                : "border-zinc-800 hover:border-zinc-700"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={
                      match.status === "live"
                        ? "live"
                        : match.status === "scheduled"
                        ? "scheduled"
                        : "completed"
                    }
                  >
                    {match.status === "live" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1 animate-live-dot inline-block" />
                    )}
                    {match.status.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-zinc-500">{match.sport?.name}</span>
                </div>
                <h3 className="text-base font-semibold text-zinc-100 mb-1">
                  {match.team1} <span className="text-orange-500 mx-1">vs</span> {match.team2}
                </h3>
                <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {match.venue}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {formatDate(match.scheduledAt)}
                  </span>
                </div>
              </div>
              {match.status === "live" && match.currentOver !== undefined && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-zinc-500">Over</p>
                  <p className="font-display text-2xl text-orange-400 leading-tight">
                    {match.currentOver}.{match.currentBall ?? 0}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

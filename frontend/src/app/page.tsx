"use client";
// Home/Live page — hero, live match selection, real-time WebSocket offer cards
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { OfferCard } from "@/components/offer-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Match, LiveOffer, WsMessage } from "@/types";
import { Zap, MapPin, Clock, Wifi, WifiOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// poll interval for live matches — 10s per spec
const POLL_INTERVAL_MS = 10_000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function MatchCard({
  match,
  selected,
  onClick,
}: {
  match: Match;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition-all duration-200",
        selected
          ? "border-orange-500/60 bg-orange-500/5 shadow-lg shadow-orange-500/10"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {match.status === "live" ? (
              <Badge variant="live">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1 animate-live-dot inline-block" />
                LIVE
              </Badge>
            ) : (
              <Badge variant="scheduled">UPCOMING</Badge>
            )}
            <span className="text-xs text-zinc-500">{match.sport?.name}</span>
          </div>
          <p className="text-sm font-semibold text-zinc-100">
            {match.team1} <span className="text-orange-500">vs</span> {match.team2}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <MapPin size={10} /> {match.venue}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} /> {formatTime(match.scheduledAt)}
            </span>
          </div>
        </div>
        {match.status === "live" && match.currentOver !== undefined ? (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-zinc-500">Over</p>
            <p className="font-display text-2xl text-orange-400 leading-tight">
              {match.currentOver}.{match.currentBall ?? 0}
            </p>
          </div>
        ) : (
          <ChevronRight size={16} className="text-zinc-600 mt-1 flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

export default function HomePage() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [liveOffers, setLiveOffers] = useState<LiveOffer[]>([]);
  const [matchInfo, setMatchInfo] = useState<{ over: number; ball: number } | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const fetchMatches = useCallback(async () => {
    try {
      const [live, scheduled] = await Promise.all([
        apiFetch<Match[]>("/matches?status=live"),
        apiFetch<Match[]>("/matches?status=scheduled"),
      ]);
      setLiveMatches(live);
      setUpcomingMatches(scheduled.slice(0, 4));
    } catch {
      // silently keep previous state on poll failure
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const id = setInterval(fetchMatches, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchMatches]);

  // auto-select first live match if none selected
  useEffect(() => {
    if (liveMatches.length > 0 && !selectedMatch) {
      setSelectedMatch(liveMatches[0]);
    }
  }, [liveMatches, selectedMatch]);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "OFFER_TRIGGERED") {
      setLiveOffers((prev) => {
        // deduplicate by offer id
        if (prev.some((o) => o.id === msg.offer.id)) return prev;
        return [msg.offer, ...prev];
      });
    }
    if (msg.type === "MATCH_UPDATE") {
      setMatchInfo({ over: msg.currentOver, ball: msg.currentBall });
    }
  }, []);

  const { connected } = useWebSocket({
    matchId: selectedMatch?._id ?? null,
    onMessage: handleWsMessage,
    enabled: selectedMatch?.status === "live",
  });

  const handleOfferExpire = useCallback((id: string) => {
    setLiveOffers((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-10 pb-14 px-4">
        {/* stadium ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-orange-500/10 blur-3xl" />
        </div>

        {/* floating 6s */}
        {[...Array(9)].map((_, i) => (
          <span
            key={i}
            className="absolute pointer-events-none font-display text-7xl select-none"
            style={{
              left: `${6 + i * 11}%`,
              bottom: "0",
              color: "rgba(249,115,22,0.12)",
              animation: `float-six ${2.2 + i * 0.25}s ease-out ${i * 0.45}s infinite`,
            }}
          >
            6
          </span>
        ))}

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1 text-xs text-orange-400 mb-6 font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-live-dot inline-block" />
            REAL-TIME CRICKET OFFER ALERTS
          </div>
          <h1 className="font-display text-6xl sm:text-8xl tracking-wide text-white leading-none mb-4">
            WHEN THE SIX<br />
            <span className="text-orange-500">LANDS.</span>{" "}
            DEALS <span className="text-orange-500">GO LIVE.</span>
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto mb-8">
            Instant offer alerts from Swiggy, Zomato, and more — triggered the moment a six is hit in any IPL match.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button size="lg" asChild>
              <a href="#live">Watch Live</a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/schedule">View Schedule</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── LIVE SECTION ────────────────────────────────── */}
      <section id="live" className="max-w-6xl mx-auto px-4 pb-16">
        {loadingMatches ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-orange-500 animate-spin" />
          </div>
        ) : liveMatches.length === 0 ? (
          /* ── NO LIVE MATCHES ── */
          <div className="text-center py-12">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 items-center justify-center mb-4">
              <Zap size={28} className="text-zinc-600" />
            </div>
            <h2 className="font-display text-2xl text-zinc-400 tracking-wide mb-2">
              NO LIVE MATCHES RIGHT NOW
            </h2>
            <p className="text-zinc-500 text-sm mb-6">Check back when a match is on</p>

            {upcomingMatches.length > 0 && (
              <div className="max-w-md mx-auto">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-medium">
                  Coming up
                </p>
                <div className="space-y-2">
                  {upcomingMatches.map((m) => (
                    <div
                      key={m._id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left"
                    >
                      <p className="text-sm font-semibold text-zinc-100">
                        {m.team1} <span className="text-orange-500">vs</span> {m.team2}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(m.scheduledAt).toLocaleString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── LIVE LAYOUT ── */
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* left: match list */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-live-dot" />
                <h2 className="font-display text-xl tracking-wide text-zinc-200">LIVE MATCHES</h2>
              </div>
              <div className="space-y-2">
                {liveMatches.map((m) => (
                  <MatchCard
                    key={m._id}
                    match={m}
                    selected={selectedMatch?._id === m._id}
                    onClick={() => {
                      setSelectedMatch(m);
                      setLiveOffers([]);
                      setMatchInfo(null);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* right: offers panel */}
            <div>
              {selectedMatch && (
                <>
                  {/* connection bar */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl tracking-wide text-zinc-200">
                      LIVE OFFERS — {selectedMatch.team1}{" "}
                      <span className="text-orange-500">vs</span> {selectedMatch.team2}
                    </h2>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                        connected
                          ? "text-green-400 border-green-500/30 bg-green-500/10"
                          : "text-zinc-500 border-zinc-700 bg-zinc-900"
                      )}
                    >
                      {connected ? (
                        <>
                          <Wifi size={11} />
                          <span className="w-1 h-1 rounded-full bg-green-400 animate-live-dot" />
                          Connected
                        </>
                      ) : (
                        <>
                          <WifiOff size={11} />
                          Reconnecting…
                        </>
                      )}
                    </div>
                  </div>

                  {/* over info */}
                  {matchInfo && (
                    <div className="mb-4 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 inline-flex items-center gap-3">
                      <span className="text-xs text-zinc-500">Current</span>
                      <span className="font-display text-xl text-orange-400">
                        Over {matchInfo.over}.{matchInfo.ball}
                      </span>
                    </div>
                  )}

                  {/* offers or watching state */}
                  {liveOffers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-10 text-center">
                      <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                        <Zap size={24} className="text-orange-400" />
                      </div>
                      <p className="font-display text-xl tracking-wide text-zinc-400 mb-1">
                        WATCHING FOR SIXES…
                      </p>
                      <p className="text-xs text-zinc-600">
                        Deals will appear here the moment a six is hit
                      </p>
                      {connected && (
                        <div className="flex justify-center gap-1 mt-4">
                          {[...Array(3)].map((_, i) => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-orange-500/60"
                              style={{ animation: `live-dot 1.2s ease-in-out ${i * 0.3}s infinite` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {liveOffers.map((offer) => (
                        <OfferCard
                          key={offer.id}
                          offer={offer}
                          onExpire={handleOfferExpire}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

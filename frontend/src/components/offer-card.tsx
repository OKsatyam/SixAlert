"use client";
// Live offer card — shows brand deal with countdown timer, pulses while active
import Image from "next/image";
import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdown, formatDiscount, cn } from "@/lib/utils";
import type { LiveOffer } from "@/types";

interface OfferCardProps {
  offer: LiveOffer;
  onExpire?: (id: string) => void;
}

export function OfferCard({ offer, onExpire }: OfferCardProps) {
  const remaining = useCountdown(offer.expiresAt);
  const isUrgent = remaining <= 30;
  const pct = offer.durationSeconds > 0 ? remaining / offer.durationSeconds : 0;

  // notify parent once expired
  if (remaining === 0 && onExpire) {
    setTimeout(() => onExpire(offer.id), 600);
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-zinc-900 p-5 overflow-hidden animate-slide-in transition-all duration-300",
        isUrgent
          ? "border-red-500/60 shadow-lg shadow-red-500/10 animate-pulse-glow"
          : "border-orange-500/30 shadow-lg shadow-orange-500/5 [animation:pulse-glow_2s_ease-in-out_infinite]"
      )}
    >
      {/* progress bar — drains as countdown hits 0 */}
      <div className="absolute top-0 left-0 h-0.5 w-full bg-zinc-800">
        <div
          className={cn(
            "h-full transition-all duration-1000",
            isUrgent ? "bg-red-500" : "bg-orange-500"
          )}
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      <div className="flex items-start justify-between gap-4">
        {/* brand logo + name */}
        <div className="flex items-center gap-3">
          {offer.brand.logoUrl ? (
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
              <Image
                src={offer.brand.logoUrl}
                alt={offer.brand.name}
                fill
                className="object-contain p-1"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0">
              <span className="text-orange-400 font-display text-xl">
                {offer.brand.name[0]}
              </span>
            </div>
          )}
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
              {offer.brand.name}
            </p>
            <p className="text-sm font-semibold text-zinc-100 mt-0.5 leading-tight">
              {offer.title}
            </p>
          </div>
        </div>

        {/* countdown */}
        <div className="text-right flex-shrink-0">
          <p className="font-display text-3xl leading-none countdown-digit tracking-wide"
            style={{ color: isUrgent ? "#ef4444" : "#f97316" }}>
            {formatCountdown(remaining)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">remaining</p>
        </div>
      </div>

      {/* discount value */}
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <span
          className={cn(
            "font-display text-2xl tracking-wide",
            isUrgent ? "text-red-400" : "text-orange-400"
          )}
        >
          {formatDiscount(offer.discountType, offer.discountValue)}
        </span>
      </div>

      {/* 6 badge */}
      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
        <span className="text-white text-xs font-bold leading-none">6</span>
      </div>
    </div>
  );
}

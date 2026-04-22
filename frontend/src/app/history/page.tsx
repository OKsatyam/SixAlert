"use client";
// History page — auth-protected, shows past offer triggers
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatDiscount } from "@/lib/utils";
import type { Offer } from "@/types";
import { History, Clock, Tag } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const { token, isLoading } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<Offer[]>("/offers?isActive=false", {}, token)
      .then(setOffers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (isLoading || (!token && !isLoading)) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <History className="text-orange-500" size={22} />
        <h1 className="font-display text-3xl tracking-wide">OFFER HISTORY</h1>
      </div>
      <p className="text-zinc-400 text-sm mb-8">Past offers from six-hit events</p>

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

      {!loading && !error && offers.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <History size={40} className="mx-auto mb-3 opacity-40" />
          <p>No past offers yet</p>
          <p className="text-xs mt-1">Offers appear here after live matches</p>
        </div>
      )}

      <div className="space-y-3">
        {offers.map((offer) => (
          <div
            key={offer._id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4"
          >
            {/* brand initial */}
            <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
              <span className="font-display text-lg text-orange-400">
                {typeof offer.brand === "object" ? offer.brand.name[0] : "?"}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-sm font-semibold text-zinc-100 truncate">{offer.title}</p>
                <Badge variant="completed">EXPIRED</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Tag size={10} />
                  {typeof offer.brand === "object" ? offer.brand.name : "Unknown"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatDate(offer.validTo)}
                </span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="font-display text-xl text-zinc-400">
                {formatDiscount(offer.discountType, offer.discountValue)}
              </p>
              <p className="text-xs text-zinc-600">{offer.durationSeconds}s duration</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

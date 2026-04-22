"use client";
// Brands page — grid of all brands with logo and name
import { useEffect, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import type { Brand } from "@/types";
import { LayoutGrid, ExternalLink } from "lucide-react";

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Brand[]>("/brands")
      .then(setBrands)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <LayoutGrid className="text-orange-500" size={22} />
        <h1 className="font-display text-3xl tracking-wide">PARTNER BRANDS</h1>
      </div>
      <p className="text-zinc-400 text-sm mb-8">
        These brands drop exclusive deals every time a six is hit.
      </p>

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

      {!loading && !error && brands.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <LayoutGrid size={40} className="mx-auto mb-3 opacity-40" />
          <p>No brands yet</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {brands.map((brand) => (
          <div
            key={brand._id}
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col items-center gap-3 hover:border-orange-500/40 hover:bg-zinc-800/60 transition-all duration-200"
          >
            {brand.logoUrl ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  fill
                  className="object-contain p-2"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <span className="font-display text-2xl text-orange-400">
                  {brand.name[0]}
                </span>
              </div>
            )}
            <p className="text-sm font-semibold text-zinc-200 text-center leading-tight">
              {brand.name}
            </p>
            {brand.website && (
              <a
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-orange-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                Visit <ExternalLink size={10} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

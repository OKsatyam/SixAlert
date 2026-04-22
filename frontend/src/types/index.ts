// Shared TypeScript types for SixAlert frontend
export interface Sport {
  _id: string;
  name: string;
  slug: string;
}

export interface Brand {
  _id: string;
  name: string;
  logoUrl?: string;
  website?: string;
  isActive: boolean;
}

export interface Match {
  _id: string;
  title: string;
  team1: string;
  team2: string;
  venue: string;
  scheduledAt: string;
  status: "scheduled" | "live" | "completed";
  currentOver?: number;
  currentBall?: number;
  sport: Sport;
}

export interface Offer {
  _id: string;
  title: string;
  brand: Brand;
  sport: Sport;
  discountType: "percentage" | "flat" | "free_delivery" | "bogo";
  discountValue: number;
  durationSeconds: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  triggerEvent: string;
}

export interface LiveOffer {
  id: string;
  title: string;
  brand: { name: string; logoUrl?: string };
  logoUrl?: string;
  discountType: string;
  discountValue: number;
  durationSeconds: number;
  expiresAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

export interface DataSourceLog {
  _id: string;
  layer: 1 | 2 | 3;
  status: "success" | "error";
  message: string;
  source?: string;
  createdAt: string;
}

export type WsMessage =
  | { type: "OFFER_TRIGGERED"; matchId: string; offer: LiveOffer }
  | { type: "MATCH_UPDATE"; matchId: string; currentOver: number; currentBall: number }
  | { type: "PING" };

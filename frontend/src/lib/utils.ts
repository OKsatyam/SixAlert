// Tailwind class merging utility
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}:${s.toString().padStart(2, "0")}`;
  return `${s}s`;
}

export function formatDiscount(type: string, value: number): string {
  switch (type) {
    case "percentage":
      return `${value}% OFF`;
    case "flat":
      return `₹${value} OFF`;
    case "free_delivery":
      return "FREE DELIVERY";
    case "bogo":
      return "BUY 1 GET 1";
    default:
      return `${value} OFF`;
  }
}

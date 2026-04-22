"use client";
// Countdown timer — ticks every second from expiresAt, returns remaining seconds
import { useState, useEffect } from "react";

export function useCountdown(expiresAt: string): number {
  const getRemaining = () =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  return remaining;
}

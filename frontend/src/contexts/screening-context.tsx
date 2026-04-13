"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useUser } from "@clerk/nextjs";

interface ScreeningState {
  remaining: number;
  limit: number;
  used: number;
  isAdmin: boolean;
  resetsAt: string;
  screenedSymbols: string[];
  loading: boolean;
  hasAccess: (symbol: string) => boolean;
  refreshQuota: () => Promise<void>;
  recordScreen: (symbol: string) => void;
}

const ScreeningContext = createContext<ScreeningState>({
  remaining: 0,
  limit: 2,
  used: 0,
  isAdmin: false,
  resetsAt: "",
  screenedSymbols: [],
  loading: true,
  hasAccess: () => false,
  refreshQuota: async () => {},
  recordScreen: () => {},
});

export function useScreening() {
  return useContext(ScreeningContext);
}

const IST_LS_KEY = "barakfi_screened";

function getIstDateString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function getLocalScreened(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IST_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { date: string; symbols: string[] };
    if (parsed.date !== getIstDateString()) {
      localStorage.removeItem(IST_LS_KEY);
      return [];
    }
    return parsed.symbols;
  } catch {
    return [];
  }
}

function saveLocalScreened(symbols: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    IST_LS_KEY,
    JSON.stringify({ date: getIstDateString(), symbols })
  );
}

export function ScreeningProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const [remaining, setRemaining] = useState(2);
  const [limit, setLimit] = useState(2);
  const [used, setUsed] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetsAt, setResetsAt] = useState("");
  const [screenedSymbols, setScreenedSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshQuota = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (userId) headers["x-clerk-user-id"] = userId;
      if (userEmail) headers["x-actor-email"] = userEmail;
      const res = await fetch("/api/quota", { headers, credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      const payload =
        data && typeof data === "object" && "data" in data ? data.data : data;
      setRemaining(payload.remaining ?? 0);
      setLimit(payload.limit ?? 2);
      setUsed(payload.used ?? 0);
      setIsAdmin(payload.is_admin ?? false);
      setResetsAt(payload.resets_at ?? "");
      const syms: string[] = payload.screened_symbols ?? [];
      setScreenedSymbols(syms);
      if (!userId) saveLocalScreened(syms);
    } catch {
      if (!userId) {
        const local = getLocalScreened();
        setScreenedSymbols(local);
        setUsed(local.length);
        setRemaining(Math.max(0, 2 - local.length));
      }
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  const recordScreen = useCallback(
    (symbol: string) => {
      const clean = symbol.trim().toUpperCase();
      setScreenedSymbols((prev) => {
        if (prev.includes(clean)) return prev;
        const next = [...prev, clean];
        if (!userId) saveLocalScreened(next);
        return next;
      });
    },
    [userId]
  );

  const hasAccess = useCallback(
    (symbol: string): boolean => {
      if (isAdmin) return true;
      if (screenedSymbols.includes("__all__")) return true;
      return screenedSymbols.includes(symbol.trim().toUpperCase());
    },
    [isAdmin, screenedSymbols]
  );

  const value = useMemo<ScreeningState>(
    () => ({
      remaining,
      limit,
      used,
      isAdmin,
      resetsAt,
      screenedSymbols,
      loading,
      hasAccess,
      refreshQuota,
      recordScreen,
    }),
    [
      remaining,
      limit,
      used,
      isAdmin,
      resetsAt,
      screenedSymbols,
      loading,
      hasAccess,
      refreshQuota,
      recordScreen,
    ]
  );

  return (
    <ScreeningContext.Provider value={value}>
      {children}
    </ScreeningContext.Provider>
  );
}

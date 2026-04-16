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
import { useAuth } from "@clerk/nextjs";

type DetailUnlockResult =
  | { kind: "granted" }
  | { kind: "redirect"; url: string }
  | { kind: "limit_exhausted"; message: string; redirectUrl?: string }
  | { kind: "error"; message: string };

interface ScreeningState {
  remaining: number;
  limit: number;
  used: number;
  isAdmin: boolean;
  resetsAt: string;
  screenedSymbols: string[];
  guestUnlockedSymbol: string | null;
  loading: boolean;
  hasAccess: (symbol: string) => boolean;
  refreshQuota: () => Promise<void>;
  recordScreen: (symbol: string) => void;
  unlockDetails: (symbol: string) => Promise<DetailUnlockResult>;
}

const ScreeningContext = createContext<ScreeningState>({
  remaining: 0,
  limit: 2,
  used: 0,
  isAdmin: false,
  resetsAt: "",
  screenedSymbols: [],
  guestUnlockedSymbol: null,
  loading: true,
  hasAccess: () => false,
  refreshQuota: async () => {},
  recordScreen: () => {},
  unlockDetails: async () => ({ kind: "error", message: "Unlock unavailable" }),
});

export function useScreening() {
  return useContext(ScreeningContext);
}

const IST_LS_KEY = "barakfi_screened";
const GUEST_DETAIL_LS_KEY = "barakfi_guest_detail_access";

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

function getGuestUnlockedSymbol(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_DETAIL_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { symbol?: string };
    const clean = parsed.symbol?.trim().toUpperCase();
    return clean || null;
  } catch {
    return null;
  }
}

function saveGuestUnlockedSymbol(symbol: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_DETAIL_LS_KEY, JSON.stringify({ symbol }));
}

export function ScreeningProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [remaining, setRemaining] = useState(2);
  const [limit, setLimit] = useState(2);
  const [used, setUsed] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetsAt, setResetsAt] = useState("");
  const [screenedSymbols, setScreenedSymbols] = useState<string[]>([]);
  const [guestUnlockedSymbol, setGuestUnlockedSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/quota", { credentials: "same-origin" });
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
      if (!userId) {
        const guestSymbol = getGuestUnlockedSymbol();
        setGuestUnlockedSymbol(guestSymbol);
        const merged = guestSymbol && !syms.includes(guestSymbol) ? [...syms, guestSymbol] : syms;
        setScreenedSymbols(merged);
        saveLocalScreened(merged);
      } else {
        setGuestUnlockedSymbol(null);
        setScreenedSymbols(syms);
      }
    } catch {
      if (!userId) {
        const local = getLocalScreened();
        const guestSymbol = getGuestUnlockedSymbol();
        setGuestUnlockedSymbol(guestSymbol);
        setScreenedSymbols(local);
        setUsed(guestSymbol ? 1 : 0);
        setRemaining(Math.max(0, 1 - (guestSymbol ? 1 : 0)));
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  const recordScreen = useCallback(
    (symbol: string) => {
      const clean = symbol.trim().toUpperCase();
      if (!clean) return;
      if (!userId) {
        setGuestUnlockedSymbol((previous) => {
          if (previous && previous !== clean) return previous;
          saveGuestUnlockedSymbol(clean);
          return clean;
        });
      }
      setScreenedSymbols((prev) => {
        if (prev.includes(clean)) return prev;
        const next = !userId && prev.length > 0 ? [prev[0]] : [...prev, clean];
        if (!userId) saveLocalScreened(next);
        return next;
      });
    },
    [userId]
  );

  const hasAccess = useCallback(
    (symbol: string): boolean => {
      if (isAdmin) return true;
      const clean = symbol.trim().toUpperCase();
      if (screenedSymbols.includes("__all__")) return true;
      if (!userId && guestUnlockedSymbol === clean) return true;
      return screenedSymbols.includes(clean);
    },
    [guestUnlockedSymbol, isAdmin, screenedSymbols, userId]
  );

  const unlockDetails = useCallback(
    async (symbol: string): Promise<DetailUnlockResult> => {
      const clean = symbol.trim().toUpperCase();
      if (!clean) {
        return { kind: "error", message: "Missing stock symbol." };
      }

      if (isAdmin || hasAccess(clean)) {
        return { kind: "granted" };
      }

      if (!userId) {
        if (!guestUnlockedSymbol || guestUnlockedSymbol === clean) {
          recordScreen(clean);
          return { kind: "granted" };
        }
        return {
          kind: "redirect",
          url: `/sign-in?redirect_url=${encodeURIComponent(`/stocks/${clean}`)}`,
        };
      }

      try {
        const response = await fetch("/api/screen/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: clean }),
          credentials: "same-origin",
        });
        const body: unknown = await response.json().catch(() => ({}));
        const payload =
          body && typeof body === "object" && "data" in body
            ? (body as { data?: unknown }).data
            : body;

        if (response.status === 429) {
          const message =
            payload && typeof payload === "object" && "detail" in payload
              ? ((payload as { detail?: string }).detail ?? "You’ve reached today’s stock detail limit.")
              : "You’ve reached today’s stock detail limit.";
          return { kind: "limit_exhausted", message, redirectUrl: "/premium" };
        }

        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "detail" in payload
              ? ((payload as { detail?: string }).detail ?? "Unable to open stock details.")
              : "Unable to open stock details.";
          return { kind: "error", message };
        }

        recordScreen(clean);
        await refreshQuota();
        return { kind: "granted" };
      } catch {
        return {
          kind: "error",
          message: "We couldn’t open the detailed breakdown right now.",
        };
      }
    },
    [guestUnlockedSymbol, hasAccess, isAdmin, recordScreen, refreshQuota, userId]
  );

  const value = useMemo<ScreeningState>(
    () => ({
      remaining,
      limit,
      used,
      isAdmin,
      resetsAt,
      screenedSymbols,
      guestUnlockedSymbol,
      loading,
      hasAccess,
      refreshQuota,
      recordScreen,
      unlockDetails,
    }),
    [
      guestUnlockedSymbol,
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
      unlockDetails,
    ]
  );

  return (
    <ScreeningContext.Provider value={value}>
      {children}
    </ScreeningContext.Provider>
  );
}

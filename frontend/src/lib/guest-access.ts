const GUEST_DAILY_LIMIT = 5;

function getTodayKey(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const date = formatter.format(new Date());
  return `barakfi_guest_screenings_${date}`;
}

export interface GuestQuota {
  used: number;
  remaining: number;
  screened: string[];
}

export function getGuestQuota(): GuestQuota {
  if (typeof window === "undefined") {
    return { used: 0, remaining: GUEST_DAILY_LIMIT, screened: [] };
  }

  const key = getTodayKey();
  const stored = localStorage.getItem(key);

  if (!stored) {
    return { used: 0, remaining: GUEST_DAILY_LIMIT, screened: [] };
  }

  try {
    const parsed = JSON.parse(stored) as { count?: number; screened?: string[] };
    const count = parsed.count ?? 0;
    return {
      used: Math.min(count, GUEST_DAILY_LIMIT),
      remaining: Math.max(0, GUEST_DAILY_LIMIT - count),
      screened: Array.isArray(parsed.screened) ? parsed.screened : [],
    };
  } catch {
    return { used: 0, remaining: GUEST_DAILY_LIMIT, screened: [] };
  }
}

export function canGuestScreen(): boolean {
  const quota = getGuestQuota();
  return quota.remaining > 0;
}

export function recordGuestScreening(symbol: string): void {
  if (typeof window === "undefined") return;

  const key = getTodayKey();
  const quota = getGuestQuota();

  if (quota.remaining <= 0) return;

  const newCount = quota.used + 1;
  const newScreened = Array.from(
    new Set([...quota.screened, symbol.trim().toUpperCase()])
  );

  localStorage.setItem(
    key,
    JSON.stringify({
      count: newCount,
      screened: newScreened,
    })
  );
}

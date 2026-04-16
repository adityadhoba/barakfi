/**
 * BarakFi Logo Component
 *
 * SVG logo with geometric "B" mark featuring a crescent accent
 * and golden glossy highlight. Supports light/dark variants.
 */

type LogoProps = {
  size?: number;
  showText?: boolean;
  variant?: "auto" | "light" | "dark";
  className?: string;
};

export function Logo({ size = 32, showText = true, variant = "auto", className }: LogoProps) {
  const textColor =
    variant === "light" ? "#ffffff" :
    variant === "dark" ? "#111827" :
    "var(--text)";

  // Unique ID prefix to avoid SVG gradient conflicts when multiple logos render
  const uid = `bk-${size}`;

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.25, textDecoration: "none" }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background with emerald gradient */}
        <rect width="40" height="40" rx="10" fill={`url(#${uid}-bg)`} />

        {/* Glossy highlight overlay */}
        <rect width="40" height="20" rx="10" fill={`url(#${uid}-gloss)`} />

        {/* Letter B */}
        <path
          d="M14 10h7c2.5 0 4.5 1 5.5 2.8 0.8 1.3 0.8 3-.1 4.3-.5.7-1.2 1.2-2 1.5v.2c1.2.3 2.1 1 2.8 1.9.7 1 1 2.2.7 3.5-.3 1.6-1.3 2.8-2.8 3.5-1 .5-2.2.8-3.5.8H14V10zm4 7.5h3.2c1.5 0 2.5-.8 2.5-2s-1-2-2.5-2H18v4zm0 8h3.8c1.7 0 2.8-.9 2.8-2.2 0-1.4-1.1-2.3-2.8-2.3H18v4.5z"
          fill="rgba(255,255,255,0.95)"
        />

        {/* Golden crescent accent */}
        <circle cx="31" cy="8" r="5.5" fill={`url(#${uid}-gold)`} />
        <circle cx="33" cy="7" r="4.2" fill={`url(#${uid}-bg)`} />

        {/* Tiny sparkle */}
        <circle cx="28" cy="5" r="1" fill="rgba(251,191,36,0.6)" />

        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id={`${uid}-gloss`} x1="20" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id={`${uid}-gold`} x1="26" y1="3" x2="36" y2="13" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      {showText && (
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 800,
            fontSize: size * 0.65,
            letterSpacing: "-0.03em",
            color: textColor,
            lineHeight: 1,
          }}
        >
          BarakFi
        </span>
      )}
    </span>
  );
}

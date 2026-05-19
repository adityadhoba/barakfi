const TRUE_LIKE = new Set(["1", "true", "yes", "on"]);

function envTrue(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") return fallback;
  return TRUE_LIKE.has(value.trim().toLowerCase());
}

/**
 * Phase-1 migration switch:
 * - true  => unified shell/body behavior (default)
 * - false => legacy body-attribute toggles
 */
export const UNIFIED_UI_SHELL_ENABLED = envTrue(
  process.env.NEXT_PUBLIC_UNIFIED_UI_SHELL,
  true,
);

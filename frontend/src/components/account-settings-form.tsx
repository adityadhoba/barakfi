"use client";

import styles from "@/app/page.module.css";
import { useTheme } from "@/components/theme-provider";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialSettings: {
    preferred_currency: string;
    risk_profile: string;
    notifications_enabled: boolean;
    theme: string;
  };
};

export function AccountSettingsForm({ initialSettings }: Props) {
  const router = useRouter();
  const { setTheme: applyTheme } = useTheme();
  const [preferredCurrency, setPreferredCurrency] = useState(initialSettings.preferred_currency);
  const [riskProfile, setRiskProfile] = useState(initialSettings.risk_profile);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initialSettings.notifications_enabled,
  );
  const [theme, setTheme] = useState(initialSettings.theme);
  const [status, setStatus] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function handleThemeChange(value: string) {
    setTheme(value);
    applyTheme(value as "dark" | "light" | "system");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    setIsSuccess(false);

    try {
      const response = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_currency: preferredCurrency,
          risk_profile: riskProfile,
          notifications_enabled: notificationsEnabled,
          theme,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || "Failed to save settings");
      }

      setStatus("Settings saved successfully.");
      setIsSuccess(true);
      startTransition(() => { router.refresh(); });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save settings right now.");
      setIsSuccess(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Preferred currency</span>
          <select value={preferredCurrency} onChange={(e) => setPreferredCurrency(e.target.value)}>
            <option value="INR">INR — Indian Rupee</option>
            <option value="USD">USD — US Dollar</option>
            <option value="AED">AED — UAE Dirham</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Risk profile</span>
          <select value={riskProfile} onChange={(e) => setRiskProfile(e.target.value)}>
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="growth">Growth</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Appearance</span>
          <select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System default</option>
          </select>
        </label>

        <label className={styles.fieldCheckbox}>
          <input
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
            type="checkbox"
          />
          <span>Enable compliance and portfolio notifications</span>
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.primaryCta} disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save settings"}
        </button>
        {status && (
          <p className={isSuccess ? styles.formStatusSuccess : styles.formStatus} role="status" aria-live="polite">
            {status}
          </p>
        )}
      </div>
    </form>
  );
}

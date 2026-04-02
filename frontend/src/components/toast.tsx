"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/* ── Types ── */
type ToastVariant = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

/* ── Context ── */
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ── Provider ── */
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-label="Notifications"
          style={{
            position: "fixed",
            bottom: 80,
            right: 20,
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: 360,
            width: "100%",
            pointerEvents: "none",
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 12,
                background: "var(--panel-solid)",
                border: `1px solid ${variantBorder(t.variant)}`,
                boxShadow: "var(--shadow-lg)",
                animation: "toastSlideIn 0.3s ease-out",
                cursor: "pointer",
                transition: "opacity 0.2s ease",
              }}
              onClick={() => dismiss(t.id)}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: variantBg(t.variant),
                  color: variantColor(t.variant),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {variantIcon(t.variant)}
              </span>
              <span
                style={{
                  fontSize: "0.84rem",
                  fontWeight: 500,
                  color: "var(--text)",
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {t.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Animation keyframe (injected once) */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/* ── Helpers ── */
function variantColor(v: ToastVariant) {
  switch (v) {
    case "success": return "var(--emerald)";
    case "error": return "var(--red)";
    case "warning": return "var(--gold)";
    case "info": return "var(--blue)";
  }
}

function variantBg(v: ToastVariant) {
  switch (v) {
    case "success": return "var(--emerald-bg)";
    case "error": return "var(--red-bg)";
    case "warning": return "var(--gold-bg)";
    case "info": return "var(--blue-bg)";
  }
}

function variantBorder(v: ToastVariant) {
  switch (v) {
    case "success": return "var(--emerald-border)";
    case "error": return "var(--red-border)";
    case "warning": return "var(--gold-border)";
    case "info": return "var(--line)";
  }
}

function variantIcon(v: ToastVariant) {
  switch (v) {
    case "success": return "\u2713";
    case "error": return "!";
    case "warning": return "\u26A0";
    case "info": return "i";
  }
}

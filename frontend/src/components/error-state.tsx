"use client";

import styles from "./error-state.module.css";

interface ErrorStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  primaryButton?: boolean;
  minHeight?: string;
}

export function ErrorState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  primaryButton = true,
  minHeight = "400px",
}: ErrorStateProps) {
  const containerStyle = minHeight ? { minHeight } : undefined;

  return (
    <div className={styles.container} style={containerStyle}>
      <div className={styles.content}>
        {icon && <div className={styles.icon}>{icon}</div>}
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
        {actionLabel && onAction && (
          <button
            type="button"
            className={primaryButton ? styles.buttonPrimary : styles.buttonSecondary}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function NotFoundState() {
  return (
    <ErrorState
      title="Page Not Found"
      description="The page you're looking for doesn't exist or has been moved."
      icon={<span className={styles.emoji}>404</span>}
      actionLabel="Go Home"
      onAction={() => (window.location.href = "/")}
    />
  );
}

export function AccessDeniedState() {
  return (
    <ErrorState
      title="Access Denied"
      description="You don't have permission to view this content."
      icon={<span className={styles.emoji}>🔒</span>}
      actionLabel="Sign In"
      onAction={() => (window.location.href = "/sign-in")}
    />
  );
}

export function ServerErrorState() {
  return (
    <ErrorState
      title="Something Went Wrong"
      description="We encountered an error. Please try again later."
      icon={<span className={styles.emoji}>⚠️</span>}
      actionLabel="Refresh Page"
      onAction={() => window.location.reload()}
    />
  );
}

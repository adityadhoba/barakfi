import Link from "next/link";
import s from "./error-state.module.css";

export interface ErrorStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function ErrorState({ icon = "⚠️", title, description, action }: ErrorStateProps) {
  return (
    <div className={s.container}>
      <div className={s.content}>
        <div className={s.icon}>{icon}</div>
        <h1 className={s.title}>{title}</h1>
        {description && <p className={s.description}>{description}</p>}
        {action && (
          <Link href={action.href} className={s.action}>
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

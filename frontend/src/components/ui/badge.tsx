import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--emerald)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--emerald)] text-white",
        secondary: "border-transparent bg-[var(--bg-muted)] text-[var(--text-secondary)]",
        outline: "text-[var(--text)] border-[var(--line)]",
        success:
          "border-[var(--status-halal-border)] bg-[var(--status-halal-bg)] text-[var(--status-halal-fg)]",
        warning:
          "border-[var(--status-doubtful-border)] bg-[var(--status-doubtful-bg)] text-[var(--status-doubtful-fg)]",
        destructive:
          "border-[var(--status-haram-border)] bg-[var(--status-haram-bg)] text-[var(--status-haram-fg)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

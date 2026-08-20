import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "error";
}

export default function EmptyState({ icon: Icon, title, description, action, tone = "default" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card bg-card/60 px-6 py-12 text-center">
      <span
        className={`mb-4 grid h-14 w-14 place-items-center rounded-full ${
          tone === "error" ? "bg-error/10 text-error" : "bg-white/5 text-text-secondary"
        }`}
      >
        <Icon size={26} aria-hidden="true" />
      </span>
      <h3 className="font-display text-base font-semibold text-text-primary">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

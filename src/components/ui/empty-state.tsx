import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
      <div className="mb-4 grid size-11 place-items-center rounded-xl border border-line bg-elevated text-muted">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("bg-white rounded-xl shadow-md p-8 text-center", className)}>
      <div className="mb-4">
        <Icon className="w-16 h-16 mx-auto text-slate-300" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-2">{title}</h2>
      {description && <p className="text-slate-600 mb-6">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

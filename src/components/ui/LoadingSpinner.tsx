import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  message = "로딩 중...",
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div className={cn("text-center py-12", className)}>
      <div
        className={cn(
          "inline-block animate-spin rounded-full border-blue-600 border-t-transparent mb-3",
          sizeClasses[size]
        )}
      />
      {message && <p className="text-slate-600">{message}</p>}
    </div>
  );
}

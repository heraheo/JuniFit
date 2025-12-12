import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export function Card({
  children,
  className,
  padding = "md",
  hover = false,
  ...props
}: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-md border border-gray-100",
        paddingClasses[padding],
        hover && "hover:shadow-lg transition-all duration-200 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

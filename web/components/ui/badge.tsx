import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "secondary";

const variants: Record<BadgeVariant, string> = {
  default:   "bg-slate-100 text-slate-600",
  success:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning:   "bg-amber-50 text-amber-700 border border-amber-200",
  danger:    "bg-red-50 text-red-600 border border-red-200",
  info:      "bg-sky-50 text-sky-700 border border-sky-200",
  secondary: "bg-slate-50 text-slate-500 border border-slate-200",
};

export function Badge({ variant = "default", className, children }: { variant?: BadgeVariant; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}

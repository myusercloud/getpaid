import { cn } from "@/lib/utils";

export function Progress({ value, max = 100, className, label }: { value: number; max?: number; className?: string; label?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">{label}</span>
          <span className="font-medium text-slate-700">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export function Input({ label, error, hint, className, id, startIcon, endIcon, ...props }: InputProps) {
  const inputId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {startIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            {startIcon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            "block w-full py-2.5 border rounded-md text-sm text-slate-900 placeholder-slate-400 bg-white",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500",
            "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
            error ? "border-red-400 bg-red-50" : "border-slate-300 hover:border-slate-400",
            startIcon ? "pl-10" : "pl-3",
            endIcon ? "pr-10" : "pr-3",
            className
          )}
          {...props}
        />
        {endIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {endIcon}
          </div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

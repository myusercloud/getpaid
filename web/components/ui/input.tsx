import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "block w-full px-3 py-2.5 border rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-white",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500",
          "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
          error ? "border-red-400 bg-red-50" : "border-slate-300 hover:border-slate-400",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

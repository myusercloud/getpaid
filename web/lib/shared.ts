// Constants
export const MEMBERSHIP_COST = 150;
export const MEMBERSHIP_BONUS = 20;
export const REFERRAL_BONUS = 50;
export const DAILY_TASK_LIMIT = 5;
export const MIN_TRANSFER_AMOUNT = 10;

// Formatters
export function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(date));
}

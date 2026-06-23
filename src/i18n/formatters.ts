export function formatFileSize(bytes: number | null | undefined, locale: string): string {
  if (!bytes) return "";
  const value = bytes < 1024 * 1024 ? bytes / 1024 : bytes / (1024 * 1024);
  const unit = bytes < 1024 * 1024 ? "KB" : "MB";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: bytes < 1024 * 1024 ? 0 : 1 }).format(value)} ${unit}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

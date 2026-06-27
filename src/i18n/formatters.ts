export function formatFileSize(bytes: number | null | undefined, locale: string): string {
  if (!bytes) return "";
  const value = bytes < 1024 * 1024 ? bytes / 1024 : bytes / (1024 * 1024);
  const unit = bytes < 1024 * 1024 ? "KB" : "MB";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: bytes < 1024 * 1024 ? 0 : 1 }).format(value)} ${unit}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "--:--";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${m}:${String(r).padStart(2, "0")}`;
}

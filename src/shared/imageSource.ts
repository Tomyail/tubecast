export type AppImageSource = string | number;

export function toExpoImageSource(source: AppImageSource | null | undefined) {
  if (!source) return null;
  return typeof source === "string" ? { uri: source } : source;
}

export function toRemoteImageUri(source: AppImageSource | null | undefined): string | undefined {
  return typeof source === "string" && source.length > 0 ? source : undefined;
}

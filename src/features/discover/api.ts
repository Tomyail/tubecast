import { SERVER_URL } from "../settings/storage";
import type { DiscoverResponse } from "./types";

export async function fetchDiscover(): Promise<DiscoverResponse> {
  const res = await fetch(`${SERVER_URL}/api/discover`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || body.error || "Request failed");
  }
  return res.json();
}

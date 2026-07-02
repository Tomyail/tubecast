import { apiClient } from "../../shared/apiClient";
import type { DiscoverResponse } from "./types";

export async function fetchDiscover(): Promise<DiscoverResponse> {
  const res = await apiClient.get<DiscoverResponse>("/api/discover", {
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  return res.data;
}

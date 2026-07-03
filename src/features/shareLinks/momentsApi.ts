import { apiClient } from "../../shared/apiClient";

export interface CreateMomentResponse {
  id: string;
}

// Mint a short-link id from the API. Hard 3s timeout (axios per-request override
// of the 15s default) so a stalled connection falls back to the long link fast —
// the caller wraps this in try/catch and degrades to buildTrackShareLandingUrl.
export async function createShareMoment(input: {
  sourceUrl: string;
  t: number;
  title?: string;
  channel?: string;
}): Promise<CreateMomentResponse> {
  const res = await apiClient.request<CreateMomentResponse>({
    url: "/api/moments",
    method: "POST",
    data: input,
    timeout: 3000,
  });
  return res.data;
}

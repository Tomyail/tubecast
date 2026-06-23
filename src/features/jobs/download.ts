import type { JobResponse } from "./api";
import { ensureTrackCached } from "./cache";
import type { Track } from "../playlist/storage";

export async function downloadAndSaveTrack(job: JobResponse): Promise<Track> {
  return ensureTrackCached(job);
}

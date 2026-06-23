import { Directory, File, Paths } from "expo-file-system";
import { getDownloadUrl, type JobResponse } from "./api";
import { trackFromReadyJob } from "./track";
import type { Track } from "../playlist/storage";

type TrackUpdater = (track: Track) => Promise<void> | void;

const inFlightDownloads = new Map<string, Promise<Track>>();

function audioDir() {
  return new Directory(Paths.document, "audio");
}

async function ensureAudioDir() {
  const dir = audioDir();
  if (!dir.exists) {
    dir.create();
  }
}

function cachedTrackFromFile(job: JobResponse, file: File): Track {
  return {
    ...trackFromReadyJob(job, "cached"),
    localPath: file.uri,
    localFilename: file.name,
    fileSize: job.audioFileSize ?? file.size ?? null,
    downloadedAt: new Date().toISOString(),
  };
}

export async function ensureTrackCached(
  job: JobResponse,
  addOrUpdateTrack?: TrackUpdater,
): Promise<Track> {
  await ensureAudioDir();

  const ext = job.audioFormat || "m4a";
  const dir = audioDir();
  const tmpFile = new File(dir, `${job.id}.${ext}.tmp`);
  const finalFile = new File(dir, `${job.id}.${ext}`);

  if (finalFile.exists) {
    const track = cachedTrackFromFile(job, finalFile);
    await addOrUpdateTrack?.(track);
    return track;
  }

  const existing = inFlightDownloads.get(job.id);
  if (existing) return existing;

  const promise = (async () => {
    try {
      try {
        if (tmpFile.exists) tmpFile.delete();
      } catch {}

      const presignedUrl = await getDownloadUrl(job.id);
      await File.downloadFileAsync(presignedUrl, tmpFile);

      if (!tmpFile.exists) throw new Error("Downloaded file not found");

      if (job.audioFileSize && tmpFile.size !== job.audioFileSize) {
        throw new Error(`Size mismatch: expected ${job.audioFileSize}, got ${tmpFile.size}`);
      }

      tmpFile.move(finalFile);
      const track = cachedTrackFromFile(job, finalFile);
      await addOrUpdateTrack?.(track);
      return track;
    } catch (err) {
      try {
        if (tmpFile.exists) tmpFile.delete();
      } catch {}
      throw err;
    } finally {
      inFlightDownloads.delete(job.id);
    }
  })();

  inFlightDownloads.set(job.id, promise);
  return promise;
}

export function __resetCacheDownloadsForTest() {
  inFlightDownloads.clear();
}

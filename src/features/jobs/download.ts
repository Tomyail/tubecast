import { Paths, Directory, File } from "expo-file-system";
import { getDownloadUrl, type JobResponse } from "./api";
import type { Track } from "../playlist/storage";

function audioDir() {
  return new Directory(Paths.document, "audio");
}

async function ensureAudioDir() {
  const dir = audioDir();
  if (!dir.exists) {
    dir.create();
  }
}

export async function downloadAndSaveTrack(job: JobResponse): Promise<Track> {
  await ensureAudioDir();

  const ext = job.audioFormat || "m4a";
  const dir = audioDir();
  const tmpFile = new File(dir, `${job.id}.${ext}.tmp`);
  const finalFile = new File(dir, `${job.id}.${ext}`);

  // Already downloaded — return immediately without hitting the network again
  if (finalFile.exists) {
    return {
      id: job.id,
      jobId: job.id,
      title: job.title || "Unknown",
      durationSeconds: job.durationSeconds || 0,
      thumbnailUrl: job.thumbnailUrl || "",
      localPath: finalFile.uri,
      localFilename: finalFile.name,
      sourceUrl: job.sourceUrl,
      fileSize: job.audioFileSize || finalFile.size,
      contentType: job.contentType || "audio/mp4",
      downloadedAt: new Date().toISOString(),
      playCount: 0,
      lastPlayedAt: null,
    };
  }

  // Clean up any leftover tmp from a previously interrupted download
  try { if (tmpFile.exists) tmpFile.delete(); } catch {}

  const presignedUrl = await getDownloadUrl(job.id);

  try {
    await File.downloadFileAsync(presignedUrl, tmpFile);

    if (!tmpFile.exists) throw new Error("Downloaded file not found");

    if (job.audioFileSize && tmpFile.size !== job.audioFileSize) {
      throw new Error(
        `Size mismatch: expected ${job.audioFileSize}, got ${tmpFile.size}`
      );
    }

    tmpFile.move(finalFile);

    return {
      id: job.id,
      jobId: job.id,
      title: job.title || "Unknown",
      durationSeconds: job.durationSeconds || 0,
      thumbnailUrl: job.thumbnailUrl || "",
      localPath: finalFile.uri,
      localFilename: finalFile.name,
      sourceUrl: job.sourceUrl,
      fileSize: job.audioFileSize || 0,
      contentType: job.contentType || "audio/mp4",
      downloadedAt: new Date().toISOString(),
      playCount: 0,
      lastPlayedAt: null,
    };
  } catch (err) {
    try { tmpFile.delete(); } catch {}
    throw err;
  }
}

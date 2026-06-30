import { Directory, File, Paths } from "expo-file-system";
import { copyAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { Track } from "../playlist/storage";
import { buildAudioExportFilename } from "./filename";

export class AudioExportUnavailableError extends Error {
  constructor() {
    super("Sharing is not available on this device");
  }
}

function exportDir() {
  return new Directory(Paths.cache, "exports");
}

function ensureExportDir(): Directory {
  const dir = exportDir();
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

export async function copyTrackToExportFile(track: Track): Promise<File> {
  if (!track.localPath) {
    throw new Error("Track has no local audio file");
  }

  const dir = ensureExportDir();
  const exportFile = new File(dir, buildAudioExportFilename(track));
  if (exportFile.exists) {
    exportFile.delete();
  }

  await copyAsync({ from: track.localPath, to: exportFile.uri });
  return exportFile;
}

export async function shareTrackAudioFile(track: Track, dialogTitle: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new AudioExportUnavailableError();
  }

  const exportFile = await copyTrackToExportFile(track);
  await Sharing.shareAsync(exportFile.uri, {
    dialogTitle,
    mimeType: "audio/mp4",
    UTI: "public.mpeg-4-audio",
  });
}

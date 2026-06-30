import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { getJob } from "../jobs/api";
import { ensureTrackCached } from "../jobs/cache";
import { usePlaylist } from "../playlist/context";
import type { Track } from "../playlist/storage";
import { useTranslation } from "../../i18n";
import { shareTrackAudioFile } from "./exportFile";

export function useTrackAudioExport() {
  const { t } = useTranslation();
  const { addTrack } = usePlaylist();
  const [exportingTrackId, setExportingTrackId] = useState<string | null>(null);

  const exportTrack = useCallback(async (track: Track) => {
    if (exportingTrackId) return;
    setExportingTrackId(track.id);

    try {
      let exportableTrack = track;
      if (track.cacheStatus !== "cached" || !track.localPath) {
        const job = await getJob(track.jobId);
        if (job.status !== "ready") {
          throw new Error("Audio is not ready");
        }
        exportableTrack = await ensureTrackCached(job, addTrack);
        await addTrack(exportableTrack);
      }

      await shareTrackAudioFile(exportableTrack, t("audioExport.dialogTitle"));
    } catch {
      Alert.alert(t("audioExport.failedTitle"), t("audioExport.failedMessage"));
    } finally {
      setExportingTrackId(null);
    }
  }, [addTrack, exportingTrackId, t]);

  return { exportingTrackId, exportTrack };
}

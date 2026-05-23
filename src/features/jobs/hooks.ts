import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { submitJob, getJob, fetchLibrary, hideLibraryItem } from "./api";
import { downloadAndSaveTrack } from "./download";
import { usePlaylist } from "../playlist/context";

export function useSubmitJob() {
  return useMutation({
    mutationFn: (sourceUrl: string) => submitJob(sourceUrl),
  });
}

export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      if (data.status === "ready" || data.status === "failed" || data.status === "expired") return false;
      return 3000;
    },
    staleTime: 0,
  });
}

export type DownloadState = "idle" | "downloading" | "done" | "error";

export function useDownloadReadyJob(jobId: string | null) {
  const { data: job } = useJobStatus(jobId);
  const { addTrack } = usePlaylist();
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloadedRef = useRef(false);

  const doDownload = useCallback(async () => {
    if (!job || job.status !== "ready" || downloadedRef.current) return;
    downloadedRef.current = true;
    setDownloadState("downloading");
    setDownloadError(null);

    try {
      const track = await downloadAndSaveTrack(job);
      await addTrack(track);
      setDownloadState("done");
    } catch (err: any) {
      setDownloadState("error");
      setDownloadError(err.message || "Download failed");
      downloadedRef.current = false;
    }
  }, [job, addTrack]);

  useEffect(() => {
    if (job?.status === "ready" && !downloadedRef.current && downloadState !== "downloading") {
      doDownload();
    }
  }, [job?.status, doDownload, downloadState]);

  const retry = useCallback(() => {
    downloadedRef.current = false;
    setDownloadState("idle");
    setDownloadError(null);
  }, []);

  return { downloadState, downloadError, retry, job };
}

export function useLibraryList() {
  return useQuery({
    queryKey: ["library"],
    queryFn: () => fetchLibrary(),
  });
}

export function useHideLibraryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => hideLibraryItem(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

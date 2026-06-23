import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { submitJob, getJob, fetchLibrary, hideLibraryItem } from "./api";
import { ensureTrackCached } from "./cache";
import { trackFromReadyJob } from "./track";
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

export type CacheState = "idle" | "caching" | "cached" | "error";
export type DownloadState = "idle" | "downloading" | "done" | "error";

export function useCacheReadyJob(jobId: string | null) {
  const { data: job } = useJobStatus(jobId);
  const { addTrack, tracks } = usePlaylist();
  const [cacheState, setCacheState] = useState<CacheState>("idle");
  const [cacheError, setCacheError] = useState<string | null>(null);
  const cachingRef = useRef(false);
  const readyTrackAddedRef = useRef<string | null>(null);

  const doCache = useCallback(async () => {
    if (!job || job.status !== "ready" || cachingRef.current) return;
    cachingRef.current = true;
    setCacheState("caching");
    setCacheError(null);

    try {
      const track = await ensureTrackCached(job, addTrack);
      await addTrack(track);
      setCacheState("cached");
    } catch (err: any) {
      const message = err.message || "Cache failed";
      setCacheState("error");
      setCacheError(message);
      await addTrack({ ...trackFromReadyJob(job, "failed"), cacheError: message });
    } finally {
      cachingRef.current = false;
    }
  }, [job, addTrack]);

  useEffect(() => {
    readyTrackAddedRef.current = null;
    cachingRef.current = false;
    setCacheState("idle");
    setCacheError(null);
  }, [jobId]);

  useEffect(() => {
    if (!job || job.status !== "ready") return;

    const existing = tracks.find((track) => track.jobId === job.id);
    if (existing?.cacheStatus === "cached") {
      setCacheState("cached");
      return;
    }

    if (readyTrackAddedRef.current !== job.id) {
      readyTrackAddedRef.current = job.id;
      void addTrack(existing ?? trackFromReadyJob(job));
    }

    if (!cachingRef.current && cacheState === "idle") {
      void doCache();
    }
  }, [job, tracks, addTrack, doCache, cacheState]);

  const retryCache = useCallback(() => {
    cachingRef.current = false;
    setCacheState("idle");
    setCacheError(null);
    void doCache();
  }, [doCache]);

  return { cacheState, cacheError, retryCache, job };
}

export function useDownloadReadyJob(jobId: string | null) {
  const { cacheState, cacheError, retryCache, job } = useCacheReadyJob(jobId);
  const downloadState: DownloadState =
    cacheState === "caching" ? "downloading" :
    cacheState === "cached" ? "done" :
    cacheState === "error" ? "error" :
    "idle";
  return {
    downloadState,
    downloadError: cacheError,
    retry: retryCache,
    job,
  };
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

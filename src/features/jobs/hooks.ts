import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createJob, fetchJob, fetchLibrary, hideLibraryItem, isJobTerminal, markLibraryItemPlayed } from "../../api";
import type { CreateJobResult, Job } from "../../types";
import { useServerConfig } from "../settings/context";

export function useJobDetail(jobId: string | null) {
  const { serverConfig, hasServerConfig } = useServerConfig();

  return useQuery({
    queryKey: ["job", serverConfig, jobId],
    queryFn: () => fetchJob(serverConfig, jobId as string),
    enabled: hasServerConfig && !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      return job && isJobTerminal(job.status) ? false : 2000;
    },
  });
}

export function useCreateJob() {
  const { serverConfig } = useServerConfig();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceUrl }: { sourceUrl: string }) => createJob(serverConfig, {
      sourceUrl,
      idempotencyKey: `mobile-${Date.now()}`,
    }),
    onSuccess: async (result: CreateJobResult) => {
      await queryClient.invalidateQueries({ queryKey: ["job", serverConfig, result.job.id] });
      await queryClient.invalidateQueries({ queryKey: ["library", serverConfig] });
    },
  });
}

export function useLibraryList() {
  const { serverConfig, hasServerConfig } = useServerConfig();

  return useQuery({
    queryKey: ["library", serverConfig],
    queryFn: () => fetchLibrary(serverConfig),
    enabled: hasServerConfig,
    refetchInterval: 5000,
  });
}

export function useHideLibraryItem() {
  const { serverConfig } = useServerConfig();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => hideLibraryItem(serverConfig, jobId),
    onSuccess: async (_, jobId) => {
      await queryClient.invalidateQueries({ queryKey: ["library", serverConfig] });
      queryClient.removeQueries({ queryKey: ["job", serverConfig, jobId] });
    },
  });
}

export function useMarkLibraryItemPlayed() {
  const { serverConfig } = useServerConfig();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => markLibraryItemPlayed(serverConfig, jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["library", serverConfig] });
    },
  });
}

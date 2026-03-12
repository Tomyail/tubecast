import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createJob, deleteJob, fetchJob, fetchJobs, isJobTerminal } from "../../api";
import type { CreateJobResult, Job } from "../../types";
import { useServerConfig } from "../settings/context";

export function useJobsList() {
  const { serverConfig, hasServerConfig } = useServerConfig();

  return useQuery({
    queryKey: ["jobs", serverConfig],
    queryFn: () => fetchJobs(serverConfig),
    enabled: hasServerConfig,
    refetchInterval: 5000,
  });
}

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
      await queryClient.invalidateQueries({ queryKey: ["jobs", serverConfig] });
      await queryClient.invalidateQueries({ queryKey: ["job", serverConfig, result.job.id] });
    },
  });
}

export function useDeleteJob() {
  const { serverConfig } = useServerConfig();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => deleteJob(serverConfig, jobId),
    onSuccess: async ({ job }) => {
      queryClient.removeQueries({ queryKey: ["job", serverConfig, job.id] });
      queryClient.setQueryData<Job[]>(["jobs", serverConfig], (current) =>
        (current ?? []).filter((item) => item.id !== job.id)
      );
      await queryClient.invalidateQueries({ queryKey: ["jobs", serverConfig] });
    },
  });
}

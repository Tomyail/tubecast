export type JobStatus = "queued" | "processing" | "ready" | "failed";

export type Job = {
  id: string;
  sourceUrl: string;
  sourceKey: string | null;
  sourceId: string | null;
  title: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  status: JobStatus;
  idempotencyKey: string | null;
  audioPath: string | null;
  audioUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  filename: string | null;
};

export type CreateJobResult = {
  job: Job;
  created: boolean;
  reason: "duplicate" | "idempotency" | "idempotency_conflict" | null;
  error?: string;
};

export type ServerConfig = {
  baseUrl: string;
  authToken: string;
};

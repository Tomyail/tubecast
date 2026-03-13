export type JobStatus = "queued" | "processing" | "ready" | "failed";
export type SummaryStatus = "idle" | "processing" | "ready" | "failed";

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
  summaryStatus: SummaryStatus;
  summaryText: string | null;
  summaryErrorMessage: string | null;
  summaryUpdatedAt: string | null;
  idempotencyKey: string | null;
  audioPath: string | null;
  audioHref: string | null;
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

export type GenerateSummaryResult = {
  job: Job;
  model?: string;
  error?: string;
};

export type SummaryStreamEvent =
  | {
    type: "start";
    jobId: string;
  }
  | {
    type: "delta";
    delta: string;
    text: string;
  }
  | {
    type: "complete";
    model?: string;
    job: Job;
  }
  | {
    type: "error";
    error: string;
    job?: Job;
  };

export type ServerConfig = {
  baseUrl: string;
  authToken: string;
};

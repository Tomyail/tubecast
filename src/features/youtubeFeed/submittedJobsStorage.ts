import AsyncStorage from "@react-native-async-storage/async-storage";

export type SubmittedFeedJob = {
  jobId: string;
  sourceUrl: string;
  submittedAt: string; // ISO 8601
};

export type SubmittedFeedJobs = Record<string, SubmittedFeedJob>;

const STORAGE_KEY = "feed_submitted_jobs";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getSubmittedFeedJobs(now = new Date()): Promise<SubmittedFeedJobs> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }

  const nowMs = now.getTime();
  let dirty = false;
  const cleaned: SubmittedFeedJobs = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (
      typeof value !== "object" ||
      value === null ||
      !("jobId" in value) ||
      !("sourceUrl" in value) ||
      !("submittedAt" in value)
    ) {
      dirty = true;
      continue;
    }

    const entry = value as SubmittedFeedJob;
    const submittedMs = new Date(entry.submittedAt).getTime();
    if (isNaN(submittedMs) || nowMs - submittedMs > TTL_MS) {
      dirty = true;
      continue;
    }

    cleaned[key] = entry;
  }

  if (dirty) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  }

  return cleaned;
}

export async function saveSubmittedFeedJob(
  platformItemId: string,
  job: SubmittedFeedJob
): Promise<void> {
  const map = await getSubmittedFeedJobs();
  map[platformItemId] = job;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function removeSubmittedFeedJob(platformItemId: string): Promise<void> {
  const map = await getSubmittedFeedJobs();
  if (!(platformItemId in map)) return;
  delete map[platformItemId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

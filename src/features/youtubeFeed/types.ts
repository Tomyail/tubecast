import type { AppImageSource } from "../../shared/imageSource";

export type FeedPlatform = "youtube";

export type FeedSource = {
  platform: FeedPlatform;
  platformSourceId: string;
  title: string;
  thumbnailUrl: AppImageSource | null;
  sourceUrl: string | null;
  addedAt?: string;
};

export type FeedItem = {
  platform: FeedPlatform;
  platformItemId: string;
  platformSourceId: string;
  title: string;
  sourceTitle: string;
  thumbnailUrl: AppImageSource | null;
  publishedAt: string;
  sourceUrl: string;
};

export type FeedItemStatus = "new" | "converting" | "ready" | "failed";

export type FeedItemWithStatus = FeedItem & {
  status: FeedItemStatus;
  jobId?: string;
};

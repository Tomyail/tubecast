export type SubscribedChannel = {
  id: string;
  title: string;
  thumbnailUrl: string;
  uploadsPlaylistId: string;
  addedAt: string;
};

export type FeedVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnailUrl: string;
  publishedAt: string;
  watchUrl: string;
};

export type FeedVideoStatus = "new" | "converting" | "ready" | "failed";

export type FeedVideoWithStatus = FeedVideo & {
  status: FeedVideoStatus;
  jobId?: string;
};

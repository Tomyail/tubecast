import type { AppImageSource } from "../../shared/imageSource";

// discover 推荐流 item。注意：不含 sourceUrl——避免在批量公开列表里吐出原始提交 URL。
// 过期兜底用 sourceId 重建规范 URL `https://www.youtube.com/watch?v=${sourceId}`。
export interface DiscoverItem {
  jobId: string;
  title: string;
  thumbnailUrl: AppImageSource | null;
  durationSeconds: number | null;
  sourceId: string;
  convertCount: number;
}

export interface DiscoverResponse {
  recent: DiscoverItem[];
  popular: DiscoverItem[];
}

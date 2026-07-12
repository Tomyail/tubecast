import type { AppImageSource } from "../../shared/imageSource";
import type { DiscoverResponse } from "../discover/types";
import type { Track } from "../playlist/storage";
import type { FeedItemWithStatus, FeedSource } from "../youtubeFeed/types";

const DEFAULT_DEMO_COVER_BASE_URL =
  "https://raw.githubusercontent.com/Tomyail/tubecast/main/mobile/screenshot-assets/demo-covers";
const DEMO_COVER_BASE_URL = (
  process.env.EXPO_PUBLIC_SCREENSHOT_DEMO_ASSET_BASE_URL || DEFAULT_DEMO_COVER_BASE_URL
).replace(/\/$/, "");

function demoCover(filename: string): string {
  return `${DEMO_COVER_BASE_URL}/${filename}`;
}

function getDemoCovers() {
  return {
    lakeReading: demoCover("lake-reading.png"),
    sunlitBook: demoCover("sunlit-book.png"),
    nightLake: demoCover("night-lake.png"),
    yogaDawn: demoCover("yoga-dawn.png"),
    podcastMic: demoCover("podcast-mic.png"),
    studyDesk: demoCover("study-desk.png"),
    minimalRoom: demoCover("minimal-room.png"),
    guitarRoom: demoCover("guitar-room.png"),
    travelRoad: demoCover("travel-road.png"),
    cookingPot: demoCover("cooking-pot.png"),
    financeChart: demoCover("finance-chart.png"),
    mindPuzzle: demoCover("mind-puzzle.png"),
  };
}

function makeTrack({
  id,
  title,
  durationSeconds,
  thumbnailUrl,
  fileSize,
  channelId,
  channelName,
  playCount = 0,
  cacheStatus = "cached",
}: {
  id: string;
  title: string;
  durationSeconds: number;
  thumbnailUrl: AppImageSource;
  fileSize: number;
  channelId: string;
  channelName: string;
  playCount?: number;
  cacheStatus?: Track["cacheStatus"];
}): Track {
  return {
    id: `demo-track-${id}`,
    jobId: `demo-job-${id}`,
    title,
    durationSeconds,
    thumbnailUrl,
    localPath: null,
    localFilename: null,
    sourceUrl: `https://example.com/tubecast-demo/${id}`,
    fileSize,
    contentType: "audio/mp4",
    downloadedAt: cacheStatus === "cached" ? "2026-07-01T09:00:00.000Z" : null,
    cacheStatus,
    cacheError: null,
    playCount,
    lastPlayedAt: playCount > 0 ? "2026-07-02T09:30:00.000Z" : null,
    channelId,
    channelName,
  };
}

export function getDemoTracks(): Track[] {
  const covers = getDemoCovers();
  return [
    makeTrack({
      id: "morning-reset",
      title: "Morning Reset: A Calm Start",
      durationSeconds: 1234,
      thumbnailUrl: covers.lakeReading,
      fileSize: 8400000,
      channelId: "demo-calm-living",
      channelName: "Calm Living",
    }),
    makeTrack({
      id: "focus-session",
      title: "Focus Session: Practical Study Habits",
      durationSeconds: 1542,
      thumbnailUrl: covers.studyDesk,
      fileSize: 11200000,
      channelId: "demo-learning-lab",
      channelName: "Learning Lab",
    }),
    makeTrack({
      id: "slow-journal",
      title: "Slow Living Journal: Small Daily Joys",
      durationSeconds: 958,
      thumbnailUrl: covers.sunlitBook,
      fileSize: 6800000,
      channelId: "demo-calm-living",
      channelName: "Calm Living",
    }),
    makeTrack({
      id: "evening-walk",
      title: "Evening Walk: City Sounds and Ideas",
      durationSeconds: 1215,
      thumbnailUrl: covers.nightLake,
      fileSize: 7900000,
      channelId: "demo-city-radio",
      channelName: "City Radio",
      playCount: 1,
    }),
    makeTrack({
      id: "simple-living",
      title: "Simple Living: Start with One Shelf",
      durationSeconds: 1187,
      thumbnailUrl: covers.minimalRoom,
      fileSize: 7600000,
      channelId: "demo-mindful-notes",
      channelName: "Mindful Notes",
      cacheStatus: "none",
    }),
    makeTrack({
      id: "mindful-growth",
      title: "Mindful Growth: A Better Evening Routine",
      durationSeconds: 1364,
      thumbnailUrl: covers.mindPuzzle,
      fileSize: 9100000,
      channelId: "demo-calm-living",
      channelName: "Calm Living",
    }),
    makeTrack({
      id: "history-walk",
      title: "History Walk: Stories Worth Remembering",
      durationSeconds: 1478,
      thumbnailUrl: covers.travelRoad,
      fileSize: 10300000,
      channelId: "demo-learning-lab",
      channelName: "Learning Lab",
    }),
    makeTrack({
      id: "tech-frontier",
      title: "Tech Frontier: Clear Ideas for Tomorrow",
      durationSeconds: 1328,
      thumbnailUrl: covers.financeChart,
      fileSize: 9700000,
      channelId: "demo-learning-lab",
      channelName: "Learning Lab",
    }),
    makeTrack({
      id: "one-good-book",
      title: "One Good Book: A Weekly Reading Note",
      durationSeconds: 1096,
      thumbnailUrl: covers.podcastMic,
      fileSize: 7200000,
      channelId: "demo-mindful-notes",
      channelName: "Mindful Notes",
    }),
  ];
}

function toDiscoverItem(track: Track) {
  const id = track.jobId.replace(/^demo-job-/, "");
  return {
    jobId: track.jobId,
    title: track.title,
    thumbnailUrl: track.thumbnailUrl,
    durationSeconds: track.durationSeconds,
    sourceId: id,
    convertCount: 0,
  };
}

export function getDemoDiscover(): DiscoverResponse {
  const tracks = getDemoTracks();
  return {
    recent: tracks.map(toDiscoverItem),
    popular: [
      tracks[3],
      tracks[1],
      tracks[5],
      tracks[0],
      tracks[7],
      tracks[4],
      tracks[8],
      tracks[6],
      tracks[2],
    ].map(toDiscoverItem),
  };
}

export function getDemoFeedSources(): FeedSource[] {
  const covers = getDemoCovers();
  return [
    {
      platform: "youtube",
      platformSourceId: "demo-calm-living",
      title: "Calm Living",
      thumbnailUrl: covers.lakeReading,
      sourceUrl: "https://example.com/tubecast-demo/calm-living",
      addedAt: "2026-07-01T08:00:00.000Z",
    },
    {
      platform: "youtube",
      platformSourceId: "demo-learning-lab",
      title: "Learning Lab",
      thumbnailUrl: covers.studyDesk,
      sourceUrl: "https://example.com/tubecast-demo/learning-lab",
      addedAt: "2026-07-01T08:30:00.000Z",
    },
    {
      platform: "youtube",
      platformSourceId: "demo-city-radio",
      title: "City Radio",
      thumbnailUrl: covers.nightLake,
      sourceUrl: "https://example.com/tubecast-demo/city-radio",
      addedAt: "2026-07-01T09:00:00.000Z",
    },
    {
      platform: "youtube",
      platformSourceId: "demo-mindful-notes",
      title: "Mindful Notes",
      thumbnailUrl: covers.mindPuzzle,
      sourceUrl: "https://example.com/tubecast-demo/mindful-notes",
      addedAt: "2026-07-01T09:30:00.000Z",
    },
  ];
}

export function getDemoFeedItems(): FeedItemWithStatus[] {
  const tracks = getDemoTracks();
  return tracks.map((track, index) => ({
    platform: "youtube",
    platformItemId: `demo-feed-${track.id.replace(/^demo-track-/, "")}`,
    platformSourceId: track.channelId ?? "demo-calm-living",
    title: track.title,
    sourceTitle: track.channelName ?? "TubeCast Demo",
    thumbnailUrl: track.thumbnailUrl,
    publishedAt: new Date(Date.UTC(2026, 6, 11, 8 - index, 30)).toISOString(),
    sourceUrl: track.sourceUrl,
    status: "new",
  }));
}

export function getDemoTrackByJobId(jobId: string): Track | null {
  return getDemoTracks().find((track) => track.jobId === jobId) ?? null;
}

export type RootStackParamList = {
  Tabs: undefined;
  Player: { jobId: string };
  AddChannel: { input?: string } | undefined;
  ManageChannels: undefined;
  Convert: { jobId?: string; sourceUrl?: string; startAtSeconds?: number };
  PublisherPreview: { channelId: string; channelName: string | null };
};

export type RootTabParamList = {
  Home: undefined;
  Feed: undefined;
  Playlist: undefined;
  Settings: undefined;
};

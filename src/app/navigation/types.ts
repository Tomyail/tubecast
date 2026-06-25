export type RootStackParamList = {
  Tabs: undefined;
  Player: { jobId: string };
  AddChannel: undefined;
  ManageChannels: undefined;
  Convert: { jobId?: string; sourceUrl?: string };
};

export type RootTabParamList = {
  Home: undefined;
  Feed: undefined;
  Playlist: undefined;
  Settings: undefined;
};

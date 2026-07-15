import { NavigationContainer, DefaultTheme, useNavigation, useNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList, RootTabParamList } from "./types";
import HomeScreen from "../../screens/HomeScreen";
import ConvertScreen from "../../screens/ConvertScreen";
import FeedScreen from "../../screens/FeedScreen";
import PlaylistScreen from "../../screens/PlaylistScreen";
import PlayerScreen from "../../screens/PlayerScreen";
import SettingsScreen from "../../screens/SettingsScreen";
import AddChannelScreen from "../../screens/AddChannelScreen";
import ManageChannelsScreen from "../../screens/ManageChannelsScreen";
import PublisherPreviewSheet from "../../screens/PublisherPreviewSheet";
import MiniPlayer from "../../components/MiniPlayer";
import Touchable from "../../components/Touchable";
import { Linking, Text, View } from "react-native";
import { useTranslation } from "../../i18n";
import { useAppTheme } from "../theme";
import { usePlayer } from "../../features/player/context";
import { getAllTracks } from "../../features/playlist/storage";
import { useRemoteConfig } from "../../features/remoteConfig/context";
import { parseTubeCastListenUrl, parseTubeCastOpenUrl } from "../../features/shareLinks/links";
import { findTrackForSourceUrl } from "../../features/shareLinks/matching";
import { isSupportedYouTubeChannelInput } from "../../features/youtubeFeed/input";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<{ HomeRoot: undefined }>();
const FeedStack = createNativeStackNavigator<{ FeedRoot: undefined }>();
const PlaylistStack = createNativeStackNavigator<{ PlaylistRoot: undefined }>();
const SettingsStack = createNativeStackNavigator<{ SettingsRoot: undefined }>();

const TAB_BAR_CONTENT_HEIGHT = 49;
type IoniconName = NonNullable<ComponentProps<typeof Ionicons>["name"]>;

function logDeepLink(message: string, details?: unknown) {
  console.log("[TubeCastDeepLink]", message, details ?? "");
}

const tabIcons: Record<keyof RootTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: "home", inactive: "home-outline" },
  Feed: { active: "play-circle", inactive: "play-circle-outline" },
  Playlist: { active: "musical-notes", inactive: "musical-notes-outline" },
  Settings: { active: "settings", inactive: "settings-outline" },
};

function useTabStackOptions() {
  const { colors } = useAppTheme();
  return {
    headerLargeTitle: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.primaryText,
    contentStyle: { backgroundColor: colors.background },
  };
}

function HomeNavigator() {
  const { t } = useTranslation();
  const screenOptions = useTabStackOptions();
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="HomeRoot" component={HomeScreen} options={{ title: t("nav.home") }} />
    </HomeStack.Navigator>
  );
}

function FeedNavigator() {
  const { t } = useTranslation();
  const screenOptions = useTabStackOptions();
  return (
    <FeedStack.Navigator screenOptions={screenOptions}>
      <FeedStack.Screen name="FeedRoot" component={FeedScreen} options={{ title: t("nav.feed") }} />
    </FeedStack.Navigator>
  );
}

function PlaylistNavigator() {
  const { t } = useTranslation();
  const screenOptions = useTabStackOptions();
  return (
    <PlaylistStack.Navigator screenOptions={screenOptions}>
      <PlaylistStack.Screen name="PlaylistRoot" component={PlaylistScreen} options={{ title: t("nav.playlist") }} />
    </PlaylistStack.Navigator>
  );
}

function SettingsNavigator() {
  const { t } = useTranslation();
  const screenOptions = useTabStackOptions();
  return (
    <SettingsStack.Navigator screenOptions={screenOptions}>
      <SettingsStack.Screen name="SettingsRoot" component={SettingsScreen} options={{ title: t("nav.settings") }} />
    </SettingsStack.Navigator>
  );
}

function CloseModalButton() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Touchable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ paddingVertical: 8 }}>
      <Text style={{ color: colors.tint, fontSize: 17 }}>{t("common.cancel")}</Text>
    </Touchable>
  );
}

function Tabs() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: colors.secondaryText,
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "500", marginTop: 2 },
          tabBarIcon: ({ color, focused, size }) => {
            const iconName = focused ? tabIcons[route.name].active : tabIcons[route.name].inactive;

            return <Ionicons name={iconName} size={focused ? size + 1 : size} color={color} />;
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeNavigator} options={{ title: t("nav.home") }} />
        <Tab.Screen name="Feed" component={FeedNavigator} options={{ title: t("nav.feed") }} />
        <Tab.Screen name="Playlist" component={PlaylistNavigator} options={{ title: t("nav.playlist") }} />
        <Tab.Screen name="Settings" component={SettingsNavigator} options={{ title: t("nav.settings") }} />
      </Tab.Navigator>
      <MiniPlayer tabBarHeight={tabBarHeight} />
    </View>
  );
}

export default function RootNavigator() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { playTrack } = usePlayer();
  const { linkProcessingEnabled } = useRemoteConfig();
  const [navigationReady, setNavigationReady] = useState(false);
  const initialUrlHandledRef = useRef(false);

  const handleDeepLink = useCallback(async (rawUrl: string | null) => {
    logDeepLink("handleDeepLink called", { rawUrl, navigationReady: navigationRef.isReady() });
    if (!rawUrl || !navigationRef.isReady()) return;
    const openLink = parseTubeCastOpenUrl(rawUrl);
    if (openLink) {
      logDeepLink("parsed open link", openLink);
      if (isSupportedYouTubeChannelInput(openLink.sourceUrl)) {
        logDeepLink("navigating to AddChannel", { sourceUrl: openLink.sourceUrl });
        navigationRef.navigate("AddChannel", { input: openLink.sourceUrl });
        return;
      }

      const tracks = await getAllTracks();
      const existingTrack = findTrackForSourceUrl(tracks, openLink.sourceUrl);
      if (existingTrack) {
        logDeepLink("playing existing track", { sourceUrl: openLink.sourceUrl, jobId: existingTrack.jobId });
        await playTrack(existingTrack, tracks);
        navigationRef.navigate("Player", { jobId: existingTrack.jobId });
        return;
      }

      if (!linkProcessingEnabled) {
        void Linking.openURL(openLink.sourceUrl);
        return;
      }
      logDeepLink("navigating to Convert", { sourceUrl: openLink.sourceUrl });
      navigationRef.navigate("Convert", {
        sourceUrl: openLink.sourceUrl,
      });
      return;
    }

    const listenLink = parseTubeCastListenUrl(rawUrl);
    if (!listenLink) {
      logDeepLink("URL did not match TubeCast deep-link formats", { rawUrl });
      return;
    }

    logDeepLink("parsed listen link", listenLink);
    const tracks = await getAllTracks();
    const existingTrack = findTrackForSourceUrl(tracks, listenLink.sourceUrl);
    if (existingTrack) {
      logDeepLink("playing existing track with timestamp", {
        sourceUrl: listenLink.sourceUrl,
        jobId: existingTrack.jobId,
        startAtSeconds: listenLink.startAtSeconds,
      });
      await playTrack(existingTrack, tracks, { startAtSeconds: listenLink.startAtSeconds });
      navigationRef.navigate("Player", { jobId: existingTrack.jobId });
      return;
    }

    if (!linkProcessingEnabled) {
      void Linking.openURL(listenLink.sourceUrl);
      return;
    }
    logDeepLink("navigating to Convert with timestamp", {
      sourceUrl: listenLink.sourceUrl,
      startAtSeconds: listenLink.startAtSeconds,
    });
    navigationRef.navigate("Convert", {
      sourceUrl: listenLink.sourceUrl,
      startAtSeconds: listenLink.startAtSeconds,
    });
  }, [linkProcessingEnabled, navigationRef, playTrack]);

  useEffect(() => {
    if (!navigationReady) return;

    if (!initialUrlHandledRef.current) {
      initialUrlHandledRef.current = true;
      logDeepLink("checking initial URL");
      void Linking.getInitialURL().then(handleDeepLink);
    }
    const subscription = Linking.addEventListener("url", (event) => {
      logDeepLink("received runtime URL event", { url: event.url });
      void handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, [handleDeepLink, navigationReady]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setNavigationReady(true)}
      theme={{
        ...(isDark ? { ...DefaultTheme, dark: true } : DefaultTheme),
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.surface,
          border: colors.border,
          primary: colors.tint,
          text: colors.primaryText,
        },
      }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primaryText,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{
            animation: "slide_from_bottom",
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="AddChannel"
          component={AddChannelScreen}
          options={{
            presentation: "formSheet",
            title: t("channel.title"),
            headerLeft: () => <CloseModalButton />,
          }}
        />
        <Stack.Screen
          name="ManageChannels"
          component={ManageChannelsScreen}
          options={{
            presentation: "modal",
            title: t("feed.manageChannels"),
            headerLeft: () => <CloseModalButton />,
          }}
        />
        <Stack.Screen
          name="Convert"
          component={ConvertScreen}
          options={{
            presentation: "formSheet",
            title: t("home.title"),
            headerLeft: () => <CloseModalButton />,
          }}
        />
        <Stack.Screen
          name="PublisherPreview"
          component={PublisherPreviewSheet}
          options={{
            presentation: "formSheet",
            title: t("player.publisher"),
            headerLeft: () => <CloseModalButton />,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

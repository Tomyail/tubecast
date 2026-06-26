import { NavigationContainer, DefaultTheme, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
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
import { Text, View } from "react-native";
import { useTranslation } from "../../i18n";
import { useAppTheme } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<{ HomeRoot: undefined }>();
const FeedStack = createNativeStackNavigator<{ FeedRoot: undefined }>();
const PlaylistStack = createNativeStackNavigator<{ PlaylistRoot: undefined }>();
const SettingsStack = createNativeStackNavigator<{ SettingsRoot: undefined }>();

const TAB_BAR_CONTENT_HEIGHT = 49;
type IoniconName = NonNullable<ComponentProps<typeof Ionicons>["name"]>;

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
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
          tabBarIcon: ({ color, focused, size }) => {
            const iconName = focused ? tabIcons[route.name].active : tabIcons[route.name].inactive;

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 4,
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
  return (
    <NavigationContainer
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
          options={{ headerShown: false }}
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
            presentation: "formSheet",
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

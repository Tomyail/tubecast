import { NavigationContainer, DefaultTheme, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList, RootTabParamList } from "./types";
import HomeScreen from "../../screens/HomeScreen";
import FeedScreen from "../../screens/FeedScreen";
import PlaylistScreen from "../../screens/PlaylistScreen";
import PlayerScreen from "../../screens/PlayerScreen";
import SettingsScreen from "../../screens/SettingsScreen";
import AddChannelScreen from "../../screens/AddChannelScreen";
import ManageChannelsScreen from "../../screens/ManageChannelsScreen";
import MiniPlayer from "../../components/MiniPlayer";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "../../i18n";

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

const screenOptions = {
  headerLargeTitle: false,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: "#fff9f3" },
  headerTintColor: "#241a12",
};

function HomeNavigator() {
  const { t } = useTranslation();
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="HomeRoot" component={HomeScreen} options={{ title: t("nav.home") }} />
    </HomeStack.Navigator>
  );
}

function FeedNavigator() {
  const { t } = useTranslation();
  return (
    <FeedStack.Navigator screenOptions={screenOptions}>
      <FeedStack.Screen name="FeedRoot" component={FeedScreen} options={{ title: t("nav.feed") }} />
    </FeedStack.Navigator>
  );
}

function PlaylistNavigator() {
  const { t } = useTranslation();
  return (
    <PlaylistStack.Navigator screenOptions={screenOptions}>
      <PlaylistStack.Screen name="PlaylistRoot" component={PlaylistScreen} options={{ title: t("nav.playlist") }} />
    </PlaylistStack.Navigator>
  );
}

function SettingsNavigator() {
  const { t } = useTranslation();
  return (
    <SettingsStack.Navigator screenOptions={screenOptions}>
      <SettingsStack.Screen name="SettingsRoot" component={SettingsScreen} options={{ title: t("nav.settings") }} />
    </SettingsStack.Navigator>
  );
}

function CloseModalButton() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ paddingVertical: 8 }}>
      <Text style={{ color: "#b65a36", fontSize: 17 }}>{t("common.cancel")}</Text>
    </Pressable>
  );
}

function Tabs() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: "#f4ede2" }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#b65a36",
          tabBarInactiveTintColor: "#6f6256",
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
          tabBarIcon: ({ color, focused, size }) => {
            const iconName = focused ? tabIcons[route.name].active : tabIcons[route.name].inactive;

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarStyle: {
            backgroundColor: "#fff9f3",
            borderTopColor: "#dbcbb9",
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
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: "#f4ede2",
          card: "#fff9f3",
          border: "#dbcbb9",
          primary: "#b65a36",
          text: "#241a12",
        },
      }}
    >
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#fff9f3" },
          headerTintColor: "#241a12",
          contentStyle: { backgroundColor: "#f4ede2" },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ title: t("nav.player") }} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

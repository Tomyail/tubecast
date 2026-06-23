import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import type { RootStackParamList, RootTabParamList } from "./types";
import HomeScreen from "../../screens/HomeScreen";
import FeedScreen from "../../screens/FeedScreen";
import PlaylistScreen from "../../screens/PlaylistScreen";
import PlayerScreen from "../../screens/PlayerScreen";
import SettingsScreen from "../../screens/SettingsScreen";
import MiniPlayer from "../../components/MiniPlayer";
import { View } from "react-native";
import { useTranslation } from "../../i18n";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function Tabs() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: "#f4ede2" }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#b65a36",
          tabBarInactiveTintColor: "#6f6256",
          tabBarStyle: {
            backgroundColor: "#fff9f3",
            borderTopColor: "#dbcbb9",
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("nav.home") }} />
        <Tab.Screen name="Feed" component={FeedScreen} options={{ title: t("nav.feed") }} />
        <Tab.Screen name="Playlist" component={PlaylistScreen} options={{ title: t("nav.playlist") }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t("nav.settings") }} />
      </Tab.Navigator>
      <MiniPlayer />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

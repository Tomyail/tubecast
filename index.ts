import "react-native-gesture-handler";
import { enableFreeze } from "react-native-screens";
import { registerRootComponent } from 'expo';

import App from './App';

// 冻结不可见的 tab/screen,避免后台屏幕重渲染占 CPU。
enableFreeze(true);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

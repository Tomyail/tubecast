import AppProviders from "./src/app/providers/AppProviders";
import RootNavigator from "./src/app/navigation/RootNavigator";

export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

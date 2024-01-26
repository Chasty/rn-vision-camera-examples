import { Stack, useNavigationContainerRef } from "expo-router";
import { useReactNavigationDevTools } from "@dev-plugins/react-navigation";

export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  useReactNavigationDevTools(navigationRef);

  return <Stack screenOptions={{ headerShown: false }}></Stack>;
}

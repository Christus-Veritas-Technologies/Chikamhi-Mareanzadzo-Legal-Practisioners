import "@/global.css";
import { Stack } from "expo-router";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppDrawer } from "@/components/app-drawer";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { DrawerProvider } from "@/contexts/drawer-context";

function BootSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-ink">
      <ActivityIndicator color="#C89A54" />
    </View>
  );
}

function RootNavigator() {
  const { isLoading, isSignedIn } = useAuth();
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");

  if (isLoading) {
    return <BootSplash />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: background },
          headerTintColor: foreground,
          headerTitleStyle: { fontWeight: "600" },
        }}
      >
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="client/[id]" options={{ headerBackTitle: "Clients" }} />
          <Stack.Screen name="case/[id]" options={{ headerBackTitle: "Back" }} />
          <Stack.Screen name="scan-review" options={{ headerBackTitle: "Scan" }} />
          <Stack.Screen name="scan-assign" options={{ headerBackTitle: "Back" }} />
          <Stack.Screen name="upload-queue" options={{ headerBackTitle: "Back" }} />
          <Stack.Screen name="doc/[id]" options={{ headerBackTitle: "Back" }} />
          <Stack.Screen name="clients" options={{ title: "Clients" }} />
          <Stack.Screen name="folders-tags" options={{ title: "Folders & Tags" }} />
          <Stack.Screen name="audit-log" options={{ title: "Audit Log" }} />
          <Stack.Screen name="users-roles" options={{ title: "Users & Roles" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen name="trash" options={{ title: "Trash" }} />
          <Stack.Screen name="downloads" options={{ title: "Downloads" }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        </Stack.Protected>
      </Stack>
      {isSignedIn ? <AppDrawer /> : null}
    </View>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppThemeProvider>
          <HeroUINativeProvider>
            <AuthProvider>
              <DrawerProvider>
                <RootNavigator />
              </DrawerProvider>
            </AuthProvider>
          </HeroUINativeProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

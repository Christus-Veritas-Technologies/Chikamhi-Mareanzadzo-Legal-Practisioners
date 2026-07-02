import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import * as Network from "expo-network";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

// Mounted once, globally, in the root layout — so every screen gets it for free instead of
// each of the ~20 native screens needing its own copy. Tracks connectivity directly rather
// than relying on any single screen's fetch failing, so it shows up the instant the device
// goes offline, not just after the next failed request.
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    Network.getNetworkStateAsync().then((state) => {
      if (mounted) setIsOffline(state.isConnected === false);
    });

    const subscription = Network.addNetworkStateListener((state) => {
      setIsOffline(state.isConnected === false);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (!isOffline) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-0 bottom-0 left-0 z-50 flex-row items-center justify-center gap-1.5 bg-ink px-4 py-2.5"
    >
      <Ionicons name="cloud-offline-outline" size={14} color="#F5F1E8" />
      <Text className="text-xs text-ink-foreground">You&apos;re offline · showing saved data.</Text>
      <Link href="/downloads" className="text-xs font-semibold text-brand underline">
        View Downloads
      </Link>
    </View>
  );
}

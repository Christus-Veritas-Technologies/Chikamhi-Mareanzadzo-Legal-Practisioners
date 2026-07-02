import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/auth-context";
import { useAppDrawer } from "@/contexts/drawer-context";
import { useApi } from "@/hooks/use-api";

type DashboardSummary = {
  stats: {
    storageUsed: string;
    storageQuotaGb: number;
    storagePercentUsed: number;
  };
};

const DRAWER_WIDTH = Math.min(300, Dimensions.get("window").width * 0.82);

type NavItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  path: string;
  /** Attorneys and paralegals have equal access everywhere except these two. */
  attorneyOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { icon: "people-outline", label: "Clients", path: "/clients" },
  { icon: "pricetags-outline", label: "Folders & Tags", path: "/folders-tags" },
  { icon: "download-outline", label: "Downloads", path: "/downloads" },
  { icon: "trash-outline", label: "Trash", path: "/trash" },
  { icon: "time-outline", label: "Audit Log", path: "/audit-log", attorneyOnly: true },
  { icon: "people-circle-outline", label: "Users & Roles", path: "/users-roles", attorneyOnly: true },
  { icon: "settings-outline", label: "Settings", path: "/settings" },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AppDrawer() {
  const { isOpen, close } = useAppDrawer();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const foreground = useThemeColor("foreground");
  const mutedForeground = useThemeColor("muted-foreground");

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const { data } = useApi<DashboardSummary>(isOpen ? "/dashboard/summary" : null);
  const stats = data?.stats;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, translateX, backdropOpacity]);

  function navigate(path: string) {
    close();
    router.push(path as never);
  }

  async function handleSignOut() {
    close();
    await signOut();
  }

  return (
    <>
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          opacity: backdropOpacity,
          zIndex: 40,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={close} />
      </Animated.View>

      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: DRAWER_WIDTH,
          transform: [{ translateX }],
          zIndex: 50,
        }}
        className="bg-background"
      >
        <View style={{ paddingTop: insets.top + 16 }} className="flex-1 px-4">
          <View className="flex-row items-center gap-3 border-b border-border pb-4">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-muted">
              <Text className="text-sm font-semibold text-brand-foreground">
                {initials(user?.name ?? "?")}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
                {user?.name ?? "—"}
              </Text>
              <Text numberOfLines={1} className="text-xs text-muted-foreground">
                {user?.email ?? ""}
              </Text>
            </View>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={20} color={foreground} />
            </Pressable>
          </View>

          <View className="mt-3 gap-0.5">
            {NAV_ITEMS.filter((item) => !item.attorneyOnly || user?.role === "ATTORNEY").map((item) => (
              <Pressable
                key={item.path}
                onPress={() => navigate(item.path)}
                className="flex-row items-center gap-3 rounded-lg px-2 py-3 active:bg-muted/30"
              >
                <Ionicons name={item.icon} size={18} color={mutedForeground} />
                <Text className="text-sm text-foreground">{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-1" />

          {stats ? (
            <View className="mb-3 rounded-xl border border-border p-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-medium text-foreground">Storage</Text>
                <Text className="text-[11px] text-muted-foreground">
                  {stats.storageUsed} / {stats.storageQuotaGb} GB
                </Text>
              </View>
              <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <View
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.min(100, stats.storagePercentUsed)}%` }}
                />
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={handleSignOut}
            className="mb-6 flex-row items-center gap-3 rounded-lg px-2 py-3 active:bg-muted/30"
          >
            <Ionicons name="log-out-outline" size={18} color="#B3413A" />
            <Text className="text-sm font-medium text-destructive">Sign out</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}

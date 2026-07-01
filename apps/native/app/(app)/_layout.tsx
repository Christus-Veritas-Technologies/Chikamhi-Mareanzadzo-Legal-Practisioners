import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";

const BRAND = "#C89A54";

function ScanTabIcon({ focused }: { focused: boolean }) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: 44,
        height: 44,
        marginTop: -18,
        backgroundColor: BRAND,
        opacity: focused ? 1 : 0.9,
      }}
    >
      <Ionicons name="scan-outline" size={22} color="#211D17" />
    </View>
  );
}

export default function AppTabsLayout() {
  const mutedForeground = useThemeColor("muted-foreground");
  const background = useThemeColor("background");
  const border = useThemeColor("border");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: mutedForeground,
        tabBarStyle: {
          backgroundColor: background,
          borderTopColor: border,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />,
          tabBarLabelStyle: { fontSize: 11, color: BRAND },
        }}
      />
      <Tabs.Screen
        name="docs"
        options={{
          title: "Docs",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: "Cases",
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

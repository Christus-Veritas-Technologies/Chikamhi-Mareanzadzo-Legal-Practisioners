import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { useAuth } from "@/contexts/auth-context";

// Mock data — swap for real queries once the Document/Matter endpoints exist.
const RECENT_DOCUMENTS = [
  { name: "Deed of Sale — Stand 4471", matter: "Moyo Holdings", status: "Executed", modified: "2h ago" },
  { name: "Affidavit of Service", matter: "Estate of T. Ncube", status: "Filed", modified: "Today" },
  { name: "Heads of Argument — Appeal", matter: "Sibanda v. Moyo", status: "Review", modified: "Yesterday" },
  { name: "Notice of Set Down", matter: "Dube Divorce", status: "Signed", modified: "3d ago" },
];

const STATUS_STYLES: Record<string, string> = {
  Executed: "bg-brand-muted text-brand-foreground",
  Filed: "bg-success/15 text-success",
  Signed: "bg-success/15 text-success",
  Review: "bg-warning/15 text-warning",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const { user } = useAuth();
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <Container className="px-5 pt-3">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-muted-foreground">{greeting()}</Text>
          <Text className="font-serif text-xl font-semibold text-foreground">{firstName}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} className="text-foreground" />
          </Pressable>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-muted">
            <Text className="text-xs font-semibold text-brand-foreground">
              {(user?.name ?? "?")
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </Text>
          </View>
        </View>
      </View>

      {/* Upload progress banner */}
      <View className="mt-5 rounded-xl bg-brand-muted px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-brand-foreground">1 upload in progress</Text>
          <Text className="text-xs text-brand-foreground/70">68%</Text>
        </View>
        <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-foreground/15">
          <View className="h-full w-[68%] rounded-full bg-brand-foreground" />
        </View>
      </View>

      {/* Jump back in */}
      <View className="mt-5 flex-row gap-3">
        <Link href="/cases" asChild>
          <Pressable className="flex-1 rounded-xl bg-ink px-4 py-4">
            <Text className="text-xl font-semibold text-ink-foreground">43</Text>
            <Text className="mt-0.5 text-xs text-ink-foreground/60">Open cases</Text>
          </Pressable>
        </Link>
        <View className="flex-1 rounded-xl border border-border px-4 py-4">
          <Text className="text-xl font-semibold text-foreground">7</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">Pending OCR</Text>
        </View>
      </View>

      {/* Recent documents */}
      <View className="mt-6 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">Recent documents</Text>
        <Link href="/docs" asChild>
          <Pressable>
            <Text className="text-xs text-brand">See all</Text>
          </Pressable>
        </Link>
      </View>

      <View className="mt-2 gap-2 pb-6">
        {RECENT_DOCUMENTS.map((doc) => (
          <View
            key={doc.name}
            className="flex-row items-center gap-3 rounded-xl border border-border px-3 py-3"
          >
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Ionicons name="document-text-outline" size={18} className="text-muted-foreground" />
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                {doc.name}
              </Text>
              <Text numberOfLines={1} className="text-xs text-muted-foreground">
                {doc.matter} · {doc.modified}
              </Text>
            </View>
            <Text
              className={`overflow-hidden rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[doc.status] ?? "bg-muted text-muted-foreground"}`}
            >
              {doc.status}
            </Text>
          </View>
        ))}
      </View>
    </Container>
  );
}

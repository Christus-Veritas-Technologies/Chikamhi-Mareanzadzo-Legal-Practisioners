import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IoniconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="items-center justify-center gap-1 px-8 py-14">
      <View className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Ionicons name={icon} size={18} color="#8A8378" />
      </View>
      <Text className="text-center text-sm font-medium text-foreground">{title}</Text>
      {description ? (
        <Text className="max-w-xs text-center text-xs text-muted-foreground">{description}</Text>
      ) : null}
      {action ? <View className="mt-2">{action}</View> : null}
    </View>
  );
}

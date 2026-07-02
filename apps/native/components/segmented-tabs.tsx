import { cn } from "heroui-native";
import { Pressable, ScrollView, Text } from "react-native";

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-row border-b border-border"
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab.value}
          onPress={() => onChange(tab.value)}
          className={cn(
            "border-b-2 px-3 py-2",
            value === tab.value ? "border-brand" : "border-transparent",
          )}
        >
          <Text
            className={cn(
              "text-xs font-medium",
              value === tab.value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

import { cn } from "heroui-native";
import { Text } from "react-native";

const STATUS_CLASSES: Record<string, string> = {
  Executed: "bg-brand-muted text-brand-foreground",
  Filed: "bg-success/15 text-success",
  Signed: "bg-success/15 text-success",
  Active: "bg-success/15 text-success",
  "Under review": "bg-warning/15 text-warning",
  Draft: "bg-muted text-muted-foreground",
  Closed: "bg-muted text-muted-foreground",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Text
      className={cn(
        "overflow-hidden rounded-full px-2 py-0.5 text-[10px] font-medium",
        STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {status}
    </Text>
  );
}

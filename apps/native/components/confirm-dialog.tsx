import { Ionicons } from "@expo/vector-icons";
import { Dialog } from "heroui-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

// The shared replacement for Alert.alert() across the native app — every destructive or "are
// you sure" action should render one of these instead of the OS alert. Two modes: plain
// confirm (no cascadeLabel) and confirm-with-cascade-checkbox (folders, cases, clients —
// "also delete the N things inside?", default unchecked).
export function ConfirmDialog({
  visible,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  cascadeLabel,
  destructive = false,
  isLoading = false,
  onConfirm,
}: {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If set, shows a checkbox (default unchecked) and passes its value to onConfirm. */
  cascadeLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: (cascade: boolean) => void | Promise<void>;
}) {
  const [cascade, setCascade] = useState(false);

  return (
    <Dialog
      isOpen={visible}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setCascade(false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-3 rounded-2xl bg-background p-4">
          <Dialog.Title className="font-serif text-base font-semibold text-foreground">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="text-xs text-muted-foreground">{description}</Dialog.Description>
          ) : null}

          {cascadeLabel ? (
            <Pressable
              onPress={() => setCascade((v) => !v)}
              className="flex-row items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
            >
              <View
                className={`mt-0.5 h-4 w-4 items-center justify-center rounded-sm border ${cascade ? "border-success bg-success" : "border-input"}`}
              >
                {cascade ? <Ionicons name="checkmark" size={10} color="white" /> : null}
              </View>
              <Text className="flex-1 text-xs text-foreground">{cascadeLabel}</Text>
            </Pressable>
          ) : null}

          <View className="mt-1 flex-row justify-end gap-3">
            <Pressable onPress={() => onOpenChange(false)} disabled={isLoading} className="px-3 py-2">
              <Text className="text-sm text-muted-foreground">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(cascade)}
              disabled={isLoading}
              className={`rounded-xl px-4 py-2 ${destructive ? "bg-destructive/10" : "bg-primary"}`}
            >
              <Text className={`text-sm font-semibold ${destructive ? "text-destructive" : "text-primary-foreground"}`}>
                {isLoading ? "Working…" : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

// Single-button info dialog — the replacement for Alert.alert() with just a message.
export function AlertDialog({
  visible,
  onOpenChange,
  title,
  description,
  buttonLabel = "OK",
}: {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  buttonLabel?: string;
}) {
  return (
    <Dialog isOpen={visible} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-3 rounded-2xl bg-background p-4">
          <Dialog.Title className="font-serif text-base font-semibold text-foreground">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="text-xs text-muted-foreground">{description}</Dialog.Description>
          ) : null}
          <View className="mt-1 flex-row justify-end">
            <Pressable onPress={() => onOpenChange(false)} className="rounded-xl bg-primary px-4 py-2">
              <Text className="text-sm font-semibold text-primary-foreground">{buttonLabel}</Text>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

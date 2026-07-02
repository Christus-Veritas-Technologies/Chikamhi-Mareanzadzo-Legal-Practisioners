import { Dialog } from "heroui-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

const COLOR_OPTIONS = [
  { value: "bg-muted-foreground", label: "Grey" },
  { value: "bg-brand", label: "Brand" },
  { value: "bg-destructive", label: "Red" },
  { value: "bg-success", label: "Green" },
  { value: "bg-warning", label: "Amber" },
  { value: "bg-chart-2", label: "Blue" },
  { value: "bg-chart-4", label: "Purple" },
];

// Same reasoning as CreateFolderDialog — replaces the old "tap + New tag, it's created
// immediately as literally 'New tag', rename it after" flow.
export function CreateTagDialog({
  visible,
  onOpenChange,
  onCreated,
}: {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (name: string, colorClass: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [colorClass, setColorClass] = useState(COLOR_OPTIONS[0]!.value);
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setName("");
    setColorClass(COLOR_OPTIONS[0]!.value);
  }

  async function save() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onCreated(name.trim(), colorClass);
      reset();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      isOpen={visible}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-3 rounded-2xl bg-background p-4">
          <Dialog.Title className="font-serif text-base font-semibold text-foreground">New tag</Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground">Name it and pick a color.</Dialog.Description>

          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder="Tag name"
            placeholderTextColor="#8A8378"
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground"
          />

          <View className="flex-row flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setColorClass(option.value)}
                className={`h-8 w-8 items-center justify-center rounded-full border-2 ${colorClass === option.value ? "border-foreground" : "border-transparent"}`}
              >
                <View className={`h-4 w-4 rounded-full ${option.value}`} />
              </Pressable>
            ))}
          </View>

          <View className="mt-1 flex-row justify-end gap-3">
            <Pressable onPress={() => onOpenChange(false)} disabled={isSaving} className="px-3 py-2">
              <Text className="text-sm text-muted-foreground">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={isSaving || !name.trim()}
              className="rounded-xl bg-primary px-4 py-2"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {isSaving ? "Creating…" : "Create tag"}
              </Text>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

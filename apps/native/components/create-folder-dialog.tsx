import { Ionicons } from "@expo/vector-icons";
import { Dialog } from "heroui-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type Tag = { id: string; name: string; colorClass: string };

// Replaces the old "type a name inline, it's created the moment you tap Add" flow — a folder
// is only created once the user confirms in this dialog, and they can pick tags for it up
// front instead of tagging it after the fact.
export function CreateFolderDialog({
  visible,
  onOpenChange,
  tags,
  onCreated,
}: {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onCreated: (name: string, tagIds: string[]) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  function toggleTag(id: string) {
    setTagIds((ids) => (ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id]));
  }

  function reset() {
    setName("");
    setTagIds([]);
  }

  async function save() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onCreated(name.trim(), tagIds);
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
          <Dialog.Title className="font-serif text-base font-semibold text-foreground">New folder</Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground">
            Name it, and optionally tag it — you can change either later.
          </Dialog.Description>

          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder="Folder name"
            placeholderTextColor="#8A8378"
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground"
          />

          {tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = tagIds.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5 ${selected ? "border-brand bg-brand/10" : "border-border"}`}
                  >
                    <View className={`h-2 w-2 rounded-full ${tag.colorClass}`} />
                    <Text className="text-xs text-foreground">{tag.name}</Text>
                    {selected ? <Ionicons name="checkmark" size={12} color="#C89A54" /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

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
                {isSaving ? "Creating…" : "Create folder"}
              </Text>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

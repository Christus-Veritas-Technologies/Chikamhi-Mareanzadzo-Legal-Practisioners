import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { BottomSheet } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

export type ClientOption = { id: string; name: string };
export type CaseOption = { id: string; title: string; caseNumber: string; client: { id: string; name: string } };
export type FolderOption = { id: string; name: string };

export type Destination = {
  clientId: string | null;
  clientName: string | null;
  caseId: string | null;
  caseTitle: string | null;
  folderId: string | null;
  folderName: string | null;
};

export const EMPTY_DESTINATION: Destination = {
  clientId: null,
  clientName: null,
  caseId: null,
  caseTitle: null,
  folderId: null,
  folderName: null,
};

// Same ranking as the web DestinationPicker: exact > starts-with > contains > loose
// subsequence fuzzy match. Returns -1 for "no match at all".
function matchScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 30 : -1;
}

const MAX_RESULTS_PER_GROUP = 6;

type ResultItem =
  | { kind: "client"; id: string; label: string; sublabel?: string; score: number }
  | { kind: "case"; id: string; label: string; sublabel?: string; score: number }
  | { kind: "folder"; id: string; label: string; sublabel?: string; score: number };

export function DestinationPickerSheet({
  visible,
  onOpenChange,
  value,
  onChange,
  clients,
  cases,
  folders,
}: {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  value: Destination;
  onChange: (next: Destination) => void;
  clients: ClientOption[];
  cases: CaseOption[];
  folders: FolderOption[];
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  const clientResults: ResultItem[] = useMemo(
    () =>
      clients
        .map((c) => ({ kind: "client" as const, id: c.id, label: c.name, score: matchScore(c.name, query) }))
        .filter((r) => r.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RESULTS_PER_GROUP),
    [clients, query],
  );

  const caseResults: ResultItem[] = useMemo(
    () =>
      cases
        .map((c) => {
          const haystack = `${c.title} ${c.caseNumber} ${c.client.name}`;
          return {
            kind: "case" as const,
            id: c.id,
            label: c.title,
            sublabel: `${c.caseNumber} · ${c.client.name}`,
            score: matchScore(haystack, query),
          };
        })
        .filter((r) => r.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RESULTS_PER_GROUP),
    [cases, query],
  );

  const folderResults: ResultItem[] = useMemo(
    () =>
      folders
        .map((f) => ({ kind: "folder" as const, id: f.id, label: f.name, score: matchScore(f.name, query) }))
        .filter((r) => r.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RESULTS_PER_GROUP),
    [folders, query],
  );

  function selectClient(client: ClientOption) {
    const caseStillValid = value.caseId ? cases.find((c) => c.id === value.caseId)?.client.id === client.id : false;
    onChange({
      ...value,
      clientId: client.id,
      clientName: client.name,
      ...(caseStillValid ? {} : { caseId: null, caseTitle: null }),
    });
  }

  function selectCase(caseOption: CaseOption) {
    onChange({
      ...value,
      clientId: caseOption.client.id,
      clientName: caseOption.client.name,
      caseId: caseOption.id,
      caseTitle: caseOption.title,
    });
  }

  function selectFolder(folder: FolderOption) {
    onChange({ ...value, folderId: folder.id, folderName: folder.name });
  }

  function selectResult(item: ResultItem) {
    if (item.kind === "client") {
      const client = clients.find((c) => c.id === item.id);
      if (client) selectClient(client);
    } else if (item.kind === "case") {
      const caseOption = cases.find((c) => c.id === item.id);
      if (caseOption) selectCase(caseOption);
    } else {
      const folder = folders.find((f) => f.id === item.id);
      if (folder) selectFolder(folder);
    }
    setQuery("");
  }

  const hasAnySelection = Boolean(value.clientId || value.caseId || value.folderId);
  const hasResults = clientResults.length + caseResults.length + folderResults.length > 0;

  function renderGroup(title: string, icon: keyof typeof Ionicons.glyphMap, items: ResultItem[]) {
    if (items.length === 0) return null;
    return (
      <View className="mb-3">
        <View className="mb-1 flex-row items-center gap-1.5 px-1">
          <Ionicons name={icon} size={11} color="#8A8378" />
          <Text className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{title}</Text>
        </View>
        <View className="gap-0.5">
          {items.map((item) => (
            <Pressable
              key={`${item.kind}-${item.id}`}
              onPress={() => selectResult(item)}
              className="rounded-lg px-2.5 py-2 active:bg-muted/60"
            >
              <Text className="text-sm text-foreground">{item.label}</Text>
              {item.sublabel ? <Text className="text-[11px] text-muted-foreground">{item.sublabel}</Text> : null}
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <BottomSheet isOpen={visible} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={["75%", "92%"]}
          enableOverDrag={false}
          enableDynamicSizing={false}
          keyboardBehavior="extend"
          contentContainerClassName="h-full"
        >
          <BottomSheet.Title className="font-serif text-base font-semibold text-foreground">
            Choose a destination
          </BottomSheet.Title>
          <BottomSheet.Description className="text-xs text-muted-foreground">
            Search for a client, case, or folder to file these documents into.
          </BottomSheet.Description>

          <View className="mt-3 px-4">
            {hasAnySelection ? (
              <View className="mb-3 gap-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
                {value.clientId ? (
                  <SelectionRow
                    icon="people-outline"
                    label="Client"
                    value={value.clientName ?? ""}
                    onClear={() => onChange({ ...value, clientId: null, clientName: null, caseId: null, caseTitle: null })}
                  />
                ) : null}
                {value.caseId ? (
                  <SelectionRow
                    icon="briefcase-outline"
                    label="Case"
                    value={value.caseTitle ?? ""}
                    onClear={() => onChange({ ...value, caseId: null, caseTitle: null })}
                  />
                ) : null}
                {value.folderId ? (
                  <SelectionRow
                    icon="folder-outline"
                    label="Folder"
                    value={value.folderName ?? ""}
                    onClear={() => onChange({ ...value, folderId: null, folderName: null })}
                  />
                ) : null}
              </View>
            ) : null}

            <View className="flex-row items-center gap-2 rounded-xl border border-border px-3 py-2">
              <Ionicons name="search-outline" size={16} color="#8A8378" />
              <BottomSheetTextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search clients, cases, folders…"
                placeholderTextColor="#8A8378"
                className="flex-1 text-sm text-foreground"
              />
            </View>
          </View>

          <BottomSheetScrollView
            className="mt-2 flex-1 px-4"
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {!hasResults ? (
              <Text className="px-1 py-6 text-center text-xs text-muted-foreground">
                {query ? "No matches." : "Start typing to search, or pick from below."}
              </Text>
            ) : (
              <>
                {renderGroup("Clients", "people-outline", clientResults)}
                {renderGroup("Cases", "briefcase-outline", caseResults)}
                {renderGroup("Folders", "folder-outline", folderResults)}
              </>
            )}
          </BottomSheetScrollView>

          <View className="flex-row gap-3 border-t border-border px-4 pt-3 pb-2">
            <Pressable
              onPress={() => onChange(EMPTY_DESTINATION)}
              disabled={!hasAnySelection}
              className="flex-1 items-center rounded-xl border border-border py-2.5"
              style={{ opacity: hasAnySelection ? 1 : 0.5 }}
            >
              <Text className="text-sm font-medium text-foreground">Clear all</Text>
            </Pressable>
            <Pressable
              onPress={() => onOpenChange(false)}
              disabled={!value.clientId}
              className="flex-1 items-center rounded-xl bg-primary py-2.5"
              style={{ opacity: value.clientId ? 1 : 0.5 }}
            >
              <Text className="text-sm font-semibold text-primary-foreground">Done</Text>
            </Pressable>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

function SelectionRow({
  icon,
  label,
  value,
  onClear,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <Ionicons name={icon} size={11} color="#8A8378" />
        <Text className="text-xs text-muted-foreground">{label}:</Text>
      </View>
      <Text numberOfLines={1} className="flex-1 text-xs font-medium text-foreground">
        {value}
      </Text>
      <Pressable onPress={onClear} hitSlop={8}>
        <Ionicons name="close" size={13} color="#8A8378" />
      </Pressable>
    </View>
  );
}

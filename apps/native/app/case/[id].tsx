import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { RouteError } from "@/components/route-error";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StatusPill } from "@/components/status-pill";
import {
  getCase,
  getClient,
  getDocumentsForCase,
  getTimelineForCase,
  type DocumentStatus,
} from "@/lib/mock-data";

const DOC_TABS = [
  { value: "all", label: "All" },
  { value: "Signed", label: "Signed" },
  { value: "Draft", label: "Draft" },
] as const;

type DocFilter = (typeof DOC_TABS)[number]["value"];

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [docFilter, setDocFilter] = useState<DocFilter>("all");

  const matter = getCase(id);
  const documents = useMemo(() => (matter ? getDocumentsForCase(matter.id) : []), [matter]);
  const filteredDocs = useMemo(() => {
    if (docFilter === "all") return documents;
    return documents.filter((d) => d.status === (docFilter as DocumentStatus));
  }, [documents, docFilter]);

  if (!matter) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Case" }} />
        <EmptyState icon="folder-open-outline" title="Case not found" />
      </Container>
    );
  }

  const client = getClient(matter.clientId);
  const timeline = getTimelineForCase(matter.id);

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: matter.caseNumber }} />

      <View className="flex-row items-center gap-2">
        <Text className="text-[11px] text-muted-foreground">{matter.caseNumber}</Text>
        <StatusPill status={matter.status} />
      </View>
      <Text className="mt-1 font-serif text-lg font-semibold text-foreground">{matter.title}</Text>
      {client ? (
        <Text className="text-xs text-muted-foreground">{client.name}</Text>
      ) : null}

      <View className="mt-4 flex-row flex-wrap gap-x-6 gap-y-2 border-y border-border py-3">
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Matter type
          </Text>
          <Text className="text-sm text-foreground">{matter.matterType}</Text>
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Lead attorney
          </Text>
          <Text className="text-sm text-foreground">{matter.leadAttorney}</Text>
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">Opened</Text>
          <Text className="text-sm text-foreground">{matter.opened}</Text>
        </View>
      </View>

      <View className="mt-4">
        <SegmentedTabs tabs={DOC_TABS} value={docFilter} onChange={setDocFilter} />
      </View>

      <View className="mt-2 gap-2">
        {filteredDocs.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="No documents here"
            description={
              docFilter === "all"
                ? "Upload the first document for this case."
                : `Nothing marked "${docFilter}".`
            }
          />
        ) : (
          filteredDocs.map((doc) => (
            <View
              key={doc.id}
              className="flex-row items-center justify-between rounded-xl border border-border px-3 py-3"
            >
              <View className="min-w-0 flex-1 pr-2">
                <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                  {doc.name}
                </Text>
                <Text className="text-xs text-muted-foreground">{doc.modified}</Text>
              </View>
              <StatusPill status={doc.status} />
            </View>
          ))
        )}
      </View>

      <Text className="mt-6 mb-2 text-sm font-medium text-foreground">Timeline</Text>
      {timeline.length === 0 ? (
        <EmptyState icon="time-outline" title="No activity yet" />
      ) : (
        <View className="gap-3 border-l border-border pl-3 pb-6">
          {timeline.map((event) => (
            <View key={event.id}>
              <Text className="text-xs text-foreground">{event.description}</Text>
              <Text className="text-[11px] text-muted-foreground">{event.timestamp}</Text>
            </View>
          ))}
        </View>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load this case" />;
}

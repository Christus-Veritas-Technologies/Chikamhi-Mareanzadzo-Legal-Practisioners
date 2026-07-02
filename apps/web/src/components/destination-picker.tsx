"use client";

import { Button } from "@CMLP/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@CMLP/ui/components/input-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@CMLP/ui/components/sheet";
import { cn } from "@CMLP/ui/lib/utils";
import { Briefcase, Folder, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

// Ranks a candidate string against a query: exact > starts-with > contains > loose
// subsequence fuzzy match. Returns -1 for "no match at all" so callers can filter it out.
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

export function DestinationPicker({
  open,
  onOpenChange,
  value,
  onChange,
  clients,
  cases,
  folders,
  side = "right",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: Destination;
  onChange: (next: Destination) => void;
  clients: ClientOption[];
  cases: CaseOption[];
  folders: FolderOption[];
  side?: "right" | "bottom";
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const clientResults: ResultItem[] = useMemo(() => {
    return clients
      .map((c) => ({ kind: "client" as const, id: c.id, label: c.name, score: matchScore(c.name, query) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [clients, query]);

  const caseResults: ResultItem[] = useMemo(() => {
    return cases
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
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [cases, query]);

  const folderResults: ResultItem[] = useMemo(() => {
    return folders
      .map((f) => ({ kind: "folder" as const, id: f.id, label: f.name, score: matchScore(f.name, query) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [folders, query]);

  const flatResults = useMemo(
    () => [...clientResults, ...caseResults, ...folderResults],
    [clientResults, caseResults, folderResults],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function selectClient(client: ClientOption) {
    // Picking a client that isn't the current case's client drops the stale case — a case
    // always belongs to exactly one client, so keeping it would silently mismatch.
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatResults[activeIndex];
      if (item) selectResult(item);
    }
  }

  const hasAnySelection = Boolean(value.clientId || value.caseId || value.folderId);

  function renderGroup(title: string, icon: React.ReactNode, items: ResultItem[]) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {icon}
          {title}
        </p>
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const flatIndex = flatResults.indexOf(item);
            return (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onMouseEnter={() => setActiveIndex(flatIndex)}
                onClick={() => selectResult(item)}
                className={cn(
                  "flex flex-col rounded-lg px-2.5 py-1.5 text-left transition-colors",
                  flatIndex === activeIndex ? "bg-brand-muted" : "hover:bg-muted/60",
                )}
              >
                <span className="text-sm text-foreground">{item.label}</span>
                {item.sublabel ? <span className="text-[11px] text-muted-foreground">{item.sublabel}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={side === "bottom" ? "max-h-[85vh]" : undefined}>
        <SheetHeader>
          <SheetTitle>Choose a destination</SheetTitle>
          <SheetDescription>Search for a client, case, or folder to file these documents into.</SheetDescription>
        </SheetHeader>

        {hasAnySelection ? (
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
            {value.clientId ? (
              <SelectionRow
                icon={<Users className="size-3" />}
                label="Client"
                value={value.clientName ?? ""}
                onClear={() => onChange({ ...value, clientId: null, clientName: null, caseId: null, caseTitle: null })}
              />
            ) : null}
            {value.caseId ? (
              <SelectionRow
                icon={<Briefcase className="size-3" />}
                label="Case"
                value={value.caseTitle ?? ""}
                onClear={() => onChange({ ...value, caseId: null, caseTitle: null })}
              />
            ) : null}
            {value.folderId ? (
              <SelectionRow
                icon={<Folder className="size-3" />}
                label="Folder"
                value={value.folderName ?? ""}
                onClear={() => onChange({ ...value, folderId: null, folderName: null })}
              />
            ) : null}
          </div>
        ) : null}

        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            autoFocus
            placeholder="Search clients, cases, folders…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </InputGroup>

        <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1">
          {flatResults.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              {query ? "No matches." : "Start typing to search, or pick from below."}
            </p>
          ) : (
            <>
              {renderGroup("Clients", <Users className="size-3" />, clientResults)}
              {renderGroup("Cases", <Briefcase className="size-3" />, caseResults)}
              {renderGroup("Folders", <Folder className="size-3" />, folderResults)}
            </>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onChange(EMPTY_DESTINATION)} disabled={!hasAnySelection}>
            Clear all
          </Button>
          <Button onClick={() => onOpenChange(false)} disabled={!value.clientId}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SelectionRow({
  icon,
  label,
  value,
  onClear,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex items-center gap-1 text-muted-foreground">
        {icon}
        {label}:
      </span>
      <span className="flex-1 truncate font-medium text-foreground">{value}</span>
      <button type="button" onClick={onClear} aria-label={`Clear ${label}`}>
        <X className="size-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

"use client";

import { Button } from "@CMLP/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@CMLP/ui/components/input-group";
import { LayoutGrid, List, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { CLIENTS } from "@/lib/mock-data";

const TOTAL_OPEN_CASES = CLIENTS.reduce((sum, c) => sum + c.openCases, 0);

export default function ClientsPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CLIENTS;
    return CLIENTS.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {CLIENTS.length} active clients · {TOTAL_OPEN_CASES} open cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-56">
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search clients…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
          </div>
          <Button variant="outline" size="icon" aria-label="List view">
            <List />
          </Button>
          <Button variant="outline" size="icon" aria-label="Grid view">
            <LayoutGrid />
          </Button>
          <Button size="lg">
            <Plus />
            New client
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-none border border-border bg-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients found"
            description={`Nothing matches "${query}". Try a different search, or add a new client.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Client</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Open cases</th>
                  <th className="px-4 py-2.5 font-medium">Documents</th>
                  <th className="px-4 py-2.5 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand-foreground">
                          {client.initials}
                        </span>
                        <span className="font-medium text-foreground hover:text-brand">
                          {client.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{client.type}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{client.openCases}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client.documents}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client.lastActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

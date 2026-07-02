"use client";

import { Button } from "@CMLP/ui/components/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";

type TrashedDoc = { id: string; name: string; deletedBy: string; deletedAt: string };

const INITIAL_TRASH: TrashedDoc[] = [
  { id: "t1", name: "Draft Notice v1.docx", deletedBy: "P. Dube", deletedAt: "28 Jun, 10:31" },
];

export default function TrashPage() {
  const [items, setItems] = useState<TrashedDoc[]>(INITIAL_TRASH);

  function restore(id: string) {
    setItems((list) => list.filter((i) => i.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Trash</h1>
        <p className="text-sm text-muted-foreground">
          Deleted documents are kept for 30 days before being permanently removed.
        </p>
      </div>

      <div className="overflow-hidden rounded-none border border-border bg-card">
        {items.length === 0 ? (
          <EmptyState icon={Trash2} title="Trash is empty" description="Deleted documents will appear here for 30 days." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Document</th>
                  <th className="px-4 py-2.5 font-medium">Deleted by</th>
                  <th className="px-4 py-2.5 font-medium">Deleted</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.deletedBy}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.deletedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => restore(item.id)}>
                        Restore
                      </Button>
                    </td>
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

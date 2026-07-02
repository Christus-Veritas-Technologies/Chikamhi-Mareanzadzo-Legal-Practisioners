"use client";

import { buttonVariants } from "@CMLP/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@CMLP/ui/components/input-group";
import { Bell, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AppTopbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !query.trim()) return;
    router.push(`/documents?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 lg:px-6">
      <div className="max-w-md flex-1">
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Find documents, cases, clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </InputGroup>
      </div>
      <div className="flex-1" />
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => toast.info("You're all caught up — there's no notification system wired up yet.")}
        className="relative flex size-8 items-center justify-center rounded-none border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
      </button>
      <Link href="/upload" className={buttonVariants({ size: "lg" })}>
        <Plus />
        Upload
      </Link>
    </header>
  );
}

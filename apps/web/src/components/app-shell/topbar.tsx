"use client";

import { buttonVariants } from "@CMLP/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@CMLP/ui/components/input-group";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { NotificationBell } from "@/components/notification-bell";

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
      <NotificationBell />
      <Link href="/upload" className={buttonVariants({ size: "lg" })}>
        <Plus />
        Upload
      </Link>
    </header>
  );
}

"use client";

import { Button } from "@CMLP/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@CMLP/ui/components/input-group";
import { Plus, Search } from "lucide-react";

export function AppTopbar() {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 lg:px-6">
      <div className="max-w-md flex-1">
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput placeholder="Find documents, cases, clients…" />
        </InputGroup>
      </div>
      <div className="flex-1" />
      <Button size="lg">
        <Plus />
        Upload
      </Button>
    </header>
  );
}

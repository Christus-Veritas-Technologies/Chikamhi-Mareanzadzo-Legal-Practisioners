"use client";

import { cn } from "@CMLP/ui/lib/utils";
import {
  FileText,
  FolderTree,
  Gauge,
  History,
  LogOut,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { useCurrentUser } from "@/contexts/current-user-context";

const WORKSPACE_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/cases", label: "Cases", icon: FolderTree },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/folders-tags", label: "Folders & Tags", icon: FolderTree },
  { href: "/audit-log", label: "Audit Log", icon: History },
] as const;

const ADMIN_LINKS = [
  { href: "/users-roles", label: "Users & Roles", icon: UserCog },
  { href: "/trash", label: "Trash", icon: Trash2 },
] as const;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ATTORNEY: "Attorney",
  PARALEGAL: "Paralegal",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavSection({
  title,
  links,
  pathname,
}: {
  title: string;
  links: readonly { href: string; label: string; icon: typeof Gauge }[];
  pathname: string;
}) {
  return (
    <div>
      <p className="px-3 text-[10px] font-semibold tracking-widest text-ink-foreground/40 uppercase">
        {title}
      </p>
      <nav className="mt-2 flex flex-col gap-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-brand text-brand-foreground font-medium"
                  : "text-ink-foreground/70 hover:bg-ink-foreground/10 hover:text-ink-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();

  function handleSignOut() {
    startSignOut(async () => {
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/sign-in");
      router.refresh();
    });
  }

  return (
    <aside className="hidden flex-col justify-between bg-ink px-3 py-5 text-ink-foreground lg:flex">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-brand font-serif text-xs font-bold text-brand-foreground">
            C&M
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Chikamhi & Mareanadzo</p>
            <p className="text-[10px] text-ink-foreground/50">Document System</p>
          </div>
        </div>

        <NavSection title="Workspace" links={WORKSPACE_LINKS} pathname={pathname} />
        <NavSection title="Administration" links={ADMIN_LINKS} pathname={pathname} />
      </div>

      <div className="flex items-center gap-2 rounded-md px-2 py-2">
        <Link href="/settings" className="flex min-w-0 flex-1 items-center gap-2 rounded-md hover:opacity-80">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand-foreground">
              {initials(user.name)}
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-ink-foreground/50">
              {ROLE_LABEL[user.role] ?? user.role}
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          aria-label="Sign out"
          className="rounded-md p-1.5 text-ink-foreground/50 transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground disabled:opacity-50"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}

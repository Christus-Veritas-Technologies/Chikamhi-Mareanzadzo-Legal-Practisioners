import { env } from "@CMLP/env/web";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-shell/sidebar";
import { AppTopbar } from "@/components/app-shell/topbar";
import { CurrentUserProvider, type CurrentUser } from "@/contexts/current-user-context";
import { SESSION_COOKIE } from "@/lib/session";

async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.user as CurrentUser;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <CurrentUserProvider user={user}>
      <div className="grid min-h-svh lg:grid-cols-[240px_1fr]">
        <AppSidebar />
        <div className="flex min-w-0 flex-col">
          <AppTopbar />
          <main className="flex-1 bg-muted/30 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}

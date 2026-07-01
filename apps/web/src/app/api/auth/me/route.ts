import { env } from "@CMLP/env/web";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in." } }, { status: 401 });
  }

  const upstream = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    // Token expired/invalid server-side — clear the stale cookie.
    cookieStore.delete(SESSION_COOKIE);
    return NextResponse.json(data, { status: upstream.status });
  }

  return NextResponse.json(data);
}

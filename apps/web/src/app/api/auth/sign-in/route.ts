import { env } from "@CMLP/env/web";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const upstream = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, data.token, SESSION_COOKIE_OPTIONS);

  return NextResponse.json({ user: data.user });
}

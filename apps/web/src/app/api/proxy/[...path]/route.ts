import { env } from "@CMLP/env/web";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

// A single authenticated proxy in front of the Hono server: the browser only ever talks to
// this same-origin route (never sees the session token), and this route attaches it as a
// Bearer header when forwarding to the real API. Covers every resource — /clients, /cases,
// /documents, /folders, /tags, /audit-log, /users — so pages don't each need their own route.
async function proxy(request: Request, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in." } }, { status: 401 });
  }

  const url = new URL(request.url);
  const upstreamUrl = `${env.NEXT_PUBLIC_SERVER_URL}/${path.join("/")}${url.search}`;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params);
}
export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params);
}
export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params);
}
export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params);
}

import { env } from "@CMLP/env/native";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; token?: string | null };

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;

  const res = await fetch(`${env.EXPO_PUBLIC_SERVER_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data?.error?.message ?? "Something went wrong. Please try again.",
      res.status,
      data?.error?.code,
    );
  }

  return data as T;
}

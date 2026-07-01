import { env } from "@CMLP/env/server";
import { sign, verify } from "hono/jwt";

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

export type AuthTokenPayload = {
  sub: string;
  role: string;
  exp: number;
};

export function createAuthToken(userId: string, role: string) {
  const payload: AuthTokenPayload = {
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + SEVEN_DAYS_IN_SECONDS,
  };
  return sign(payload, env.JWT_SECRET);
}

export async function verifyAuthToken(token: string) {
  return verify(token, env.JWT_SECRET) as Promise<AuthTokenPayload>;
}

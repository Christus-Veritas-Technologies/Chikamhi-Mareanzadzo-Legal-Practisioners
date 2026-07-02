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
  return sign(payload, env.JWT_SECRET, "HS256");
}

export async function verifyAuthToken(token: string) {
  // hono@4.12+ made the algorithm argument required on verify() (it's still optional on
  // sign(), which is what made this so easy to miss — sign() kept working, verify() started
  // silently failing every check). Must match the algorithm sign() actually used (HS256, the
  // hono/jwt default).
  return verify(token, env.JWT_SECRET, "HS256") as Promise<AuthTokenPayload>;
}

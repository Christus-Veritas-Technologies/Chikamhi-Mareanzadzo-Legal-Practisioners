// Shared shape helpers so every controller returns consistent, frontend-friendly JSON.

import { getDownloadUrl } from "@/lib/r2";

export function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  lastActiveAt: Date | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    lastActive: user.lastActiveAt?.toISOString() ?? null,
  };
}

export async function serializeProfile(user: {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  lastActiveAt: Date | null;
  avatarKey: string | null;
  notifyOnCaseUpload: boolean;
  notifyOnOcrComplete: boolean;
  notifyWeeklyDigest: boolean;
}) {
  const avatarUrl = user.avatarKey ? await getDownloadUrl(user.avatarKey) : null;
  return {
    ...serializeUser(user),
    avatarUrl,
    notifications: {
      caseUpload: user.notifyOnCaseUpload,
      ocrComplete: user.notifyOnOcrComplete,
      weeklyDigest: user.notifyWeeklyDigest,
    },
  };
}

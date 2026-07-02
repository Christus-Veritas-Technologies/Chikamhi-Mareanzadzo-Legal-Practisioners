// Shared shape helpers so every controller returns consistent, frontend-friendly JSON.

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

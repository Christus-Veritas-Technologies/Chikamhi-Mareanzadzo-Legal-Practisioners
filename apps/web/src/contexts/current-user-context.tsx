"use client";

import { createContext, useContext } from "react";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
};

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const user = useContext(CurrentUserContext);
  if (!user) {
    throw new Error("useCurrentUser must be used within (app), inside CurrentUserProvider.");
  }
  return user;
}

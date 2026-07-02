import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";

type DrawerContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

export function DrawerProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

export function useAppDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    throw new Error("useAppDrawer must be used within DrawerProvider");
  }
  return ctx;
}

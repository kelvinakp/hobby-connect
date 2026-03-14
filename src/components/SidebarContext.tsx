"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface SidebarContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export default function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((p) => !p), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SidebarContext.Provider value={{ open, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

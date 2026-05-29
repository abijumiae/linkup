"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ActiveChatContextValue = {
  activeChatPeerId: string | null;
  setActiveChatPeerId: (peerId: string | null) => void;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

export function ActiveChatProvider({ children }: { children: React.ReactNode }) {
  const [activeChatPeerId, setActiveChatPeerId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      activeChatPeerId,
      setActiveChatPeerId,
    }),
    [activeChatPeerId],
  );

  return (
    <ActiveChatContext.Provider value={value}>
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext);

  if (!context) {
    throw new Error("useActiveChat must be used within ActiveChatProvider");
  }

  return context;
}

export function useOptionalActiveChat() {
  return useContext(ActiveChatContext);
}

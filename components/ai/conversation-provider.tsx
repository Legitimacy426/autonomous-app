"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

type ConversationContextType = {
  sessionId: string;
  resetSession: () => void;
};

const ConversationContext = createContext<ConversationContextType>({
  sessionId: "",
  resetSession: () => {},
});

export function useConversation() {
  return useContext(ConversationContext);
}

export function ConversationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize session ID from localStorage or create new one
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("conversationSessionId");
      return stored || uuidv4();
    }
    return uuidv4();
  });

  // Save session ID to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("conversationSessionId", sessionId);
    }
  }, [sessionId]);

  // Function to reset the session
  const resetSession = () => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    if (typeof window !== "undefined") {
      localStorage.setItem("conversationSessionId", newSessionId);
    }
  };

  return (
    <ConversationContext.Provider value={{ sessionId, resetSession }}>
      {children}
    </ConversationContext.Provider>
  );
}

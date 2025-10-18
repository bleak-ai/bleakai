import {createContext, useContext, useState, type ReactNode} from "react";

interface ThreadContextType {
  threadId: string | null;
  setThreadId: (threadId: string | null) => void;
  submitAnswers?: (answers: Array<{question: string; answer: string}>) => Promise<void>;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

interface ThreadProviderProps {
  children: ReactNode;
}

export function ThreadProvider({children}: ThreadProviderProps) {
  const [threadId, setThreadId] = useState<string | null>(null);

  return (
    <ThreadContext.Provider value={{threadId, setThreadId}}>
      {children}
    </ThreadContext.Provider>
  );
}

export function useThread() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThread must be used within a ThreadProvider");
  }
  return context;
}

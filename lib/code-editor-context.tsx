"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Language {
  id: number;
  name: string;
  extension: string;
}

interface PendingCodeChange {
  code: string;
  description: string;
}

interface CodeEditorContextType {
  code: string;
  setCode: (code: string) => void;
  selectedLanguage: Language | null;
  setSelectedLanguage: (language: Language | null) => void;
  pendingChange: PendingCodeChange | null;
  setPendingChange: (change: PendingCodeChange | null) => void;
  lastChangeResult: "accepted" | "rejected" | null;
  acceptChange: () => void;
  rejectChange: () => void;
}

const CodeEditorContext = createContext<CodeEditorContextType | null>(null);

export function CodeEditorProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingCodeChange | null>(null);
  const [lastChangeResult, setLastChangeResult] = useState<"accepted" | "rejected" | null>(null);

  const acceptChange = useCallback(() => {
    if (pendingChange) {
      setCode(pendingChange.code);
      setPendingChange(null);
      setLastChangeResult("accepted");
    }
  }, [pendingChange]);

  const rejectChange = useCallback(() => {
    setPendingChange(null);
    setLastChangeResult("rejected");
  }, []);

  // Reset lastChangeResult when a new pending change is set
  const handleSetPendingChange = useCallback((change: PendingCodeChange | null) => {
    if (change) {
      setLastChangeResult(null);
    }
    setPendingChange(change);
  }, []);

  return (
    <CodeEditorContext.Provider
      value={{
        code,
        setCode,
        selectedLanguage,
        setSelectedLanguage,
        pendingChange,
        setPendingChange: handleSetPendingChange,
        lastChangeResult,
        acceptChange,
        rejectChange,
      }}
    >
      {children}
    </CodeEditorContext.Provider>
  );
}

export function useCodeEditor() {
  const context = useContext(CodeEditorContext);
  if (!context) {
    throw new Error("useCodeEditor must be used within a CodeEditorProvider");
  }
  return context;
}

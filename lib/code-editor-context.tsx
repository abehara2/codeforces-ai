"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";

interface Language {
  id: number;
  name: string;
  extension: string;
}

interface PendingCodeChange {
  code: string;
  description: string;
}

export interface SampleTest {
  input: string;
  expectedOutput: string;
}

type SaveStatus = "saved" | "unsaved" | "saving";

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
  // Save functionality
  chatId: string | null;
  saveStatus: SaveStatus;
  saveCode: () => Promise<void>;
  initializeCode: (savedCode: Record<string, string>) => void;
  getSavedCodeForLanguage: (extension: string) => string | undefined;
  // Input functionality
  stdin: string;
  setStdin: (stdin: string) => void;
  // Sample tests
  sampleTests: SampleTest[];
  activeSampleTestIndex: number | null; // null means custom input
}

const CodeEditorContext = createContext<CodeEditorContextType | null>(null);

interface CodeEditorProviderProps {
  children: ReactNode;
  chatId?: string | null;
  initialCodeByLanguage?: Record<string, string>;
  initialSampleTests?: SampleTest[];
}

export function CodeEditorProvider({ 
  children, 
  chatId = null, 
  initialCodeByLanguage = {},
  initialSampleTests = [],
}: CodeEditorProviderProps) {
  const [code, setCodeState] = useState("");
  const [selectedLanguage, setSelectedLanguageState] = useState<Language | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingCodeChange | null>(null);
  const [lastChangeResult, setLastChangeResult] = useState<"accepted" | "rejected" | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  
  // Sample tests and input tracking
  const [sampleTests] = useState<SampleTest[]>(initialSampleTests);
  const [stdin, setStdinState] = useState(initialSampleTests[0]?.input || "");
  const [activeSampleTestIndex, setActiveSampleTestIndex] = useState<number | null>(
    initialSampleTests.length > 0 ? 0 : null
  );

  // Custom setStdin that also tracks if we're using a sample test
  const setStdin = useCallback((newStdin: string) => {
    setStdinState(newStdin);
    // Check if this matches any sample test input
    const matchingIndex = sampleTests.findIndex(test => test.input === newStdin);
    setActiveSampleTestIndex(matchingIndex >= 0 ? matchingIndex : null);
  }, [sampleTests]);
  
  // Store saved code per language
  const savedCodeByLanguage = useRef<Record<string, string>>(initialCodeByLanguage);
  const lastSavedCode = useRef<string>("");

  // Initialize saved code from props
  const initializeCode = useCallback((savedCode: Record<string, string>) => {
    savedCodeByLanguage.current = savedCode;
  }, []);

  // Get saved code for a specific language
  const getSavedCodeForLanguage = useCallback((extension: string): string | undefined => {
    return savedCodeByLanguage.current[extension];
  }, []);

  // Custom setCode that tracks unsaved changes
  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode);
    // Check if code differs from last saved
    if (newCode !== lastSavedCode.current) {
      setSaveStatus("unsaved");
    }
  }, []);

  // Custom setSelectedLanguage that loads saved code for that language
  const setSelectedLanguage = useCallback((language: Language | null) => {
    setSelectedLanguageState(language);
    if (language) {
      const savedCode = savedCodeByLanguage.current[language.extension] || "";
      lastSavedCode.current = savedCode;
      // Don't mark as unsaved when switching languages
      setSaveStatus("saved");
    }
  }, []);

  // Save code to the database
  const saveCode = useCallback(async () => {
    if (!chatId || !selectedLanguage || saveStatus === "saving") return;

    setSaveStatus("saving");
    
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_code",
          languageExtension: selectedLanguage.extension,
          code,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        savedCodeByLanguage.current = data.codeByLanguage;
        lastSavedCode.current = code;
        setSaveStatus("saved");
      } else {
        console.error("Failed to save code");
        setSaveStatus("unsaved");
      }
    } catch (error) {
      console.error("Error saving code:", error);
      setSaveStatus("unsaved");
    }
  }, [chatId, selectedLanguage, code, saveStatus]);

  const acceptChange = useCallback(() => {
    if (pendingChange) {
      setCodeState(pendingChange.code);
      setPendingChange(null);
      setLastChangeResult("accepted");
      // Mark as unsaved since code changed
      setSaveStatus("unsaved");
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
        chatId,
        saveStatus,
        saveCode,
        initializeCode,
        getSavedCodeForLanguage,
        stdin,
        setStdin,
        sampleTests,
        activeSampleTestIndex,
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

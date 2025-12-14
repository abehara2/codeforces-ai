"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { Play, Loader2, RotateCcw, GripHorizontal, Check, X, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCodeEditor } from "@/lib/code-editor-context";

interface Language {
  id: number;
  name: string;
  extension: string;
}

interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

const LANGUAGE_MONACO_MAP: Record<string, string> = {
  cpp: "cpp",
  c: "c",
  java: "java",
  py: "python",
  rb: "ruby",
  cs: "csharp",
  go: "go",
  rs: "rust",
  ts: "typescript",
  js: "javascript",
  kt: "kotlin",
  php: "php",
  swift: "swift",
  lua: "lua",
  pl: "perl",
  r: "r",
  scala: "scala",
  hs: "haskell",
};

const DEFAULT_CODE: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Your code here
    
    return 0;
}`,
  py: `# Your code here
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Your code here
    }
}`,
  js: `const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Your code here
`,
};

export function CodeEditor() {
  const {
    code,
    setCode,
    selectedLanguage,
    setSelectedLanguage,
    pendingChange,
    acceptChange,
    rejectChange,
  } = useCodeEditor();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [executing, setExecuting] = useState(false);
  
  // Resizable panel state
  const [panelHeight, setPanelHeight] = useState(200);
  const [inputWidth, setInputWidth] = useState(50); // percentage
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingVertical = useRef(false);
  const isDraggingHorizontal = useRef(false);

  // Vertical resize handler (panel height)
  const handleVerticalMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingVertical.current = true;
    document.addEventListener("mousemove", handleVerticalMouseMove);
    document.addEventListener("mouseup", handleVerticalMouseUp);
  }, []);

  const handleVerticalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingVertical.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newHeight = containerRect.bottom - e.clientY;
    setPanelHeight(Math.max(100, Math.min(500, newHeight)));
  }, []);

  const handleVerticalMouseUp = useCallback(() => {
    isDraggingVertical.current = false;
    document.removeEventListener("mousemove", handleVerticalMouseMove);
    document.removeEventListener("mouseup", handleVerticalMouseUp);
  }, [handleVerticalMouseMove]);

  // Horizontal resize handler (input/output split)
  const handleHorizontalMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingHorizontal.current = true;
    document.addEventListener("mousemove", handleHorizontalMouseMove);
    document.addEventListener("mouseup", handleHorizontalMouseUp);
  }, []);

  const handleHorizontalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingHorizontal.current || !containerRef.current) return;
    const panel = containerRef.current.querySelector("[data-io-panel]");
    if (!panel) return;
    const panelRect = panel.getBoundingClientRect();
    const newWidth = ((e.clientX - panelRect.left) / panelRect.width) * 100;
    setInputWidth(Math.max(20, Math.min(80, newWidth)));
  }, []);

  const handleHorizontalMouseUp = useCallback(() => {
    isDraggingHorizontal.current = false;
    document.removeEventListener("mousemove", handleHorizontalMouseMove);
    document.removeEventListener("mouseup", handleHorizontalMouseUp);
  }, [handleHorizontalMouseMove]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await fetch("/api/execute");
        if (response.ok) {
          const data = await response.json();
          setLanguages(data.languages);
          // Only set default language and code if not already set
          if (data.languages.length > 0 && !selectedLanguage) {
            const defaultLang = data.languages.find((l: Language) => l.extension === "cpp") || data.languages[0];
            setSelectedLanguage(defaultLang);
            if (!code.trim()) {
              setCode(DEFAULT_CODE[defaultLang.extension] || "");
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch languages:", error);
      }
    };

    fetchLanguages();
  }, [selectedLanguage, code, setSelectedLanguage, setCode]);

  const handleLanguageChange = (languageId: string) => {
    const lang = languages.find((l) => l.id.toString() === languageId);
    if (lang) {
      setSelectedLanguage(lang);
      if (!code.trim() || Object.values(DEFAULT_CODE).includes(code)) {
        setCode(DEFAULT_CODE[lang.extension] || "");
      }
    }
  };

  const handleExecute = async () => {
    if (!selectedLanguage || !code.trim()) return;

    setExecuting(true);
    setResult(null);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          languageId: selectedLanguage.id,
          stdin,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const error = await response.json();
        setResult({
          stdout: null,
          stderr: error.error || "Execution failed",
          compile_output: null,
          message: null,
          status: { id: -1, description: "Error" },
          time: null,
          memory: null,
        });
      }
    } catch (error) {
      console.error("Execution error:", error);
      setResult({
        stdout: null,
        stderr: "Failed to execute code",
        compile_output: null,
        message: null,
        status: { id: -1, description: "Error" },
        time: null,
        memory: null,
      });
    } finally {
      setExecuting(false);
    }
  };

  const getMonacoLanguage = () => {
    if (!selectedLanguage) return "plaintext";
    return LANGUAGE_MONACO_MAP[selectedLanguage.extension] || "plaintext";
  };

  const handleReset = () => {
    if (selectedLanguage) {
      setCode(DEFAULT_CODE[selectedLanguage.extension] || "");
    }
    setStdin("");
    setResult(null);
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Select
            value={selectedLanguage?.id.toString() || ""}
            onValueChange={handleLanguageChange}
            disabled={!!pendingChange}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.id} value={lang.id.toString()}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleReset}
            variant="outline"
            className="gap-2 hover:bg-destructive hover:text-white hover:border-destructive"
            disabled={!!pendingChange}
          >
            <RotateCcw className="h-4 w-4" />
            RESET
          </Button>
          <Button
            onClick={handleExecute}
            variant="outline"
            disabled={executing || !code.trim() || !!pendingChange}
            className="gap-2 hover:bg-green-600 hover:text-white hover:border-green-600"
          >
            {executing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            RUN
          </Button>
          <Button
            disabled={!code.trim() || !!pendingChange}
            className="gap-2 btn-shimmer"
          >
            <Send className="h-4 w-4" />
            SUBMIT
          </Button>
        </div>
      </div>

      {/* Editor / Diff Editor */}
      <div className="flex-1 min-h-0 relative">
        {pendingChange ? (
          <DiffEditor
            height="100%"
            language={getMonacoLanguage()}
            original={code}
            modified={pendingChange.code}
            theme="vs"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Space Mono', monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              readOnly: true,
              renderSideBySide: true,
              enableSplitViewResizing: true,
              originalEditable: false,
              renderOverviewRuler: false,
              diffWordWrap: "on",
            }}
          />
        ) : (
          <Editor
            height="100%"
            language={getMonacoLanguage()}
            value={code}
            onChange={(value) => setCode(value || "")}
            theme="vs"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Space Mono', monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: "on",
            }}
          />
        )}

        {/* Floating Accept/Reject Card - shown when there's a pending change */}
        {pendingChange && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-white rounded-lg shadow-lg border border-border px-4 py-3 flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                </div>
                <div className="max-w-xs">
                  <p className="text-sm font-medium text-foreground truncate">
                    {pendingChange.description}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={rejectChange}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={acceptChange}
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vertical Resize Handle */}
      <div
        onMouseDown={handleVerticalMouseDown}
        className="h-2 bg-muted border-y border-border cursor-ns-resize flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
      >
        <GripHorizontal className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Input/Output Panel */}
      <div 
        data-io-panel
        className="flex"
        style={{ height: panelHeight }}
      >
        {/* Stdin */}
        <div 
          className="flex flex-col border-r border-border overflow-hidden"
          style={{ width: `${inputWidth}%` }}
        >
          <div className="h-9 px-3 flex items-center border-b border-border bg-muted flex-shrink-0">
            <span className="text-xs font-medium">INPUT</span>
          </div>
          <div className="flex-1 overflow-auto">
            <Textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter input here..."
              className="h-full min-h-full w-full resize-none border-0 focus-visible:ring-0 font-mono text-sm rounded-none"
            />
          </div>
        </div>

        {/* Horizontal Resize Handle */}
        <div
          onMouseDown={handleHorizontalMouseDown}
          className="w-2 bg-muted cursor-ew-resize hover:bg-muted-foreground/20 transition-colors flex items-center justify-center"
        >
          <div className="w-0.5 h-8 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Output */}
        <div 
          className="flex flex-col overflow-hidden"
          style={{ width: `${100 - inputWidth}%` }}
        >
          <div className="h-9 px-3 flex items-center justify-between border-b border-border bg-muted flex-shrink-0">
            <span className="text-xs font-medium">OUTPUT</span>
            {result && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {result.time && <span>{result.time}s</span>}
                {result.memory && <span>{(result.memory / 1024).toFixed(1)}MB</span>}
                <span
                  className={
                    result.status?.id === 3
                      ? "text-green-600"
                      : "text-destructive"
                  }
                >
                  {result.status?.description}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <pre className="p-3 text-sm font-mono whitespace-pre-wrap">
              {result?.compile_output && (
                <span className="text-destructive">{result.compile_output}</span>
              )}
              {result?.stderr && (
                <span className="text-destructive">{result.stderr}</span>
              )}
              {result?.stdout || (
                <span className="text-muted-foreground">
                  {executing ? "Running..." : "Run your code to see output"}
                </span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

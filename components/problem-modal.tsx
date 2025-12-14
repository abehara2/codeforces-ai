"use client";

import { FileCode, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProblemStatement } from "./problem-statement";

interface ProblemModalProps {
  html: string;
  problemId: string;
}

export function ProblemModal({ html, problemId }: ProblemModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileCode className="h-4 w-4" />
          VIEW PROBLEM
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-bold flex items-center gap-2">
            PROBLEM {problemId}
            <a
              href={`https://codeforces.com/problemset/problem/${problemId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="View on Codeforces"
            >
              <Link2 className="h-4 w-4" />
            </a>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <ProblemStatement html={html} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


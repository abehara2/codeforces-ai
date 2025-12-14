"use client";

import { MessageSquare } from "lucide-react";

export function SelectProblemContent() {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      {/* Empty state */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Select a problem from the sidebar to continue
          </p>
        </div>
      </div>
    </div>
  );
}

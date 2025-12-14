"use client";

import { useEffect, useRef } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

interface ProblemStatementProps {
  html: string;
}

export function ProblemStatement({ html }: ProblemStatementProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Set the HTML content as-is from Codeforces
    container.innerHTML = html;

    // Only process math: find all text nodes and render $$$...$$$  patterns with KaTeX
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text.includes("$$$")) {
          const parts = text.split(/(\$\$\$[^$]+\$\$\$)/g);
          if (parts.length > 1) {
            const fragment = document.createDocumentFragment();
            parts.forEach((part) => {
              if (part.startsWith("$$$") && part.endsWith("$$$")) {
                const mathContent = part.slice(3, -3);
                const span = document.createElement("span");
                try {
                  katex.render(mathContent, span, {
                    throwOnError: false,
                    displayMode: false,
                  });
                } catch {
                  span.textContent = mathContent;
                }
                fragment.appendChild(span);
              } else if (part) {
                fragment.appendChild(document.createTextNode(part));
              }
            });
            node.parentNode?.replaceChild(fragment, node);
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Process child nodes (create copy to avoid modification during iteration)
        Array.from(node.childNodes).forEach(processNode);
      }
    };

    processNode(container);

    // Process test-example-line-n elements for alternating colors and hover
    const testLineElements = container.querySelectorAll('[class*="test-example-line-"]');
    const lineNumberRegex = /test-example-line-(\d+)/;
    
    // Track event listeners for cleanup
    const eventListeners: Array<{ el: Element; type: string; handler: EventListener }> = [];

    testLineElements.forEach((el) => {
      const match = el.className.match(lineNumberRegex);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        // Add odd/even class for alternating colors
        el.classList.add(lineNum % 2 === 1 ? "test-line-odd" : "test-line-even");
        
        // Add hover listeners
        const lineClass = `test-example-line-${lineNum}`;
        
        const mouseEnterHandler = () => {
          // Highlight all elements with the same line number
          container.querySelectorAll(`.${lineClass}`).forEach((lineEl) => {
            lineEl.classList.add("test-line-highlight");
          });
        };
        
        const mouseLeaveHandler = () => {
          // Remove highlight from all elements with the same line number
          container.querySelectorAll(`.${lineClass}`).forEach((lineEl) => {
            lineEl.classList.remove("test-line-highlight");
          });
        };
        
        el.addEventListener("mouseenter", mouseEnterHandler);
        el.addEventListener("mouseleave", mouseLeaveHandler);
        
        eventListeners.push(
          { el, type: "mouseenter", handler: mouseEnterHandler },
          { el, type: "mouseleave", handler: mouseLeaveHandler }
        );
      }
    });

    // Apply custom styles
    const style = document.createElement("style");
    style.textContent = `
      .problem-statement {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 0.8rem;
        line-height: 1.5;
      }
      .problem-statement .header .title {
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
      }
      .problem-statement .header .time-limit,
      .problem-statement .header .memory-limit,
      .problem-statement .header .input-file,
      .problem-statement .header .output-file {
        font-size: 0.7rem;
        color: #666;
        margin-bottom: 0.2rem;
      }
      .problem-statement .section-title {
        font-weight: 600;
        font-size: 0.85rem;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        border-bottom: 1px solid #e5e5e5;
        padding-bottom: 0.35rem;
      }
      .problem-statement p {
        margin-bottom: 0.5rem;
      }
      .problem-statement .input-specification,
      .problem-statement .output-specification {
        margin-top: 1rem;
      }
      .problem-statement ul,
      .problem-statement ol {
        margin: 0.5rem 0;
        padding-left: 1.25rem;
      }
      .problem-statement li {
        margin-bottom: 0.35rem;
      }
      
      /* Sample Tests Table Styling */
      .problem-statement .sample-tests {
        margin-top: 1rem;
      }
      .problem-statement .sample-tests .section-title {
        margin-bottom: 0.75rem;
      }
      .problem-statement .sample-test {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .problem-statement .sample-test .input,
      .problem-statement .sample-test .output {
        flex: 1;
        min-width: 0;
      }
      .problem-statement .sample-test .input .title,
      .problem-statement .sample-test .output .title {
        font-weight: 600;
        font-size: 0.7rem;
        margin-bottom: 0.35rem;
        color: #333;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }
      .problem-statement .sample-test .input pre,
      .problem-statement .sample-test .output pre {
        background: #f8f9fa;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
        padding: 0;
        margin: 0;
        overflow-x: auto;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 0.75rem;
        line-height: 1.4;
        white-space: pre;
      }
      .problem-statement .sample-test .input pre {
        background: transparent;
        border-color: #cce5ff;
      }
      .problem-statement .sample-test .output pre {
        background: transparent;
        border-color: #c6f6d5;
      }
      
      /* Test example line styling - alternating rows */
      [class*="test-example-line-"] {
        display: block;
        padding: 0.2rem 0.5rem;
        transition: background-color 0.15s ease;
      }
      .test-line-odd {
        background-color: #f5f5f5;
      }
      .test-line-even {
        background-color: #fafafa;
      }
      /* Hover highlight - mustard yellow */
      .test-line-highlight {
        background-color: #fbbf24 !important;
      }
      
      /* Alternative: If sample tests use table layout */
      .problem-statement .sample-tests table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0.75rem 0;
      }
      .problem-statement .sample-tests table td {
        vertical-align: top;
        width: 50%;
      }
      .problem-statement .sample-tests table pre {
        background: transparent;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
        padding: 0;
        margin: 0;
        overflow-x: auto;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 0.75rem;
        line-height: 1.4;
        white-space: pre;
      }
      .problem-statement .sample-tests table td:first-child pre {
        border-color: #cce5ff;
      }
      .problem-statement .sample-tests table td:last-child pre {
        border-color: #c6f6d5;
      }
      
      /* Note section */
      .problem-statement .note {
        margin-top: 1rem;
        padding: 0.75rem;
        background: #fffbeb;
        border-left: 3px solid #f59e0b;
        border-radius: 0 4px 4px 0;
      }
      .problem-statement .note .section-title {
        margin-top: 0;
        border-bottom: none;
        padding-bottom: 0;
      }
      
      /* Code/tt elements */
      .problem-statement tt,
      .problem-statement code {
        background: #f1f5f9;
        padding: 0.1rem 0.3rem;
        border-radius: 2px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 0.85em;
      }
      
      /* Hide copy elements from Codeforces */
      .problem-statement .input-output-copier,
      .problem-statement [class*="copy"],
      .problem-statement [title*="Copy"],
      .problem-statement [title*="copy"] {
        display: none !important;
      }
    `;
    container.appendChild(style);

    return () => {
      // Cleanup event listeners
      eventListeners.forEach(({ el, type, handler }) => {
        el.removeEventListener(type, handler);
      });
      if (container.contains(style)) {
        container.removeChild(style);
      }
    };
  }, [html]);

  return (
    <div className="p-4">
      <div ref={containerRef} className="problem-content" />
    </div>
  );
}


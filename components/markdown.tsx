"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeAnalysisMarkdown, rehypeLineBreaks } from "@/lib/markdown";
import { safeUrl } from "@/lib/types";
export default function Markdown({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={`markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeLineBreaks]}
        skipHtml
        components={{
          a: ({ href, children }) =>
            safeUrl(href || "") ? (
              <a
                href={safeUrl(href || "")}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt }) => (alt ? <span>{alt}</span> : null),
          table: ({ children }) => (
            <div
              className="markdown-table-scroll"
              role="region"
              aria-label="분석 표"
              tabIndex={0}
            >
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {normalizeAnalysisMarkdown(text)}
      </ReactMarkdown>
    </div>
  );
}

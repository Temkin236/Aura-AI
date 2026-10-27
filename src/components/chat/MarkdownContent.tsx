import React, { useState } from 'react';
import { Check, Copy, ChevronDown, ChevronUp, Info, AlertTriangle, Sparkles, AlertCircle } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  // Parse content into blocks: code blocks vs text blocks
  const parts = parseMarkdown(content);

  return (
    <div className="space-y-4 text-[15px] leading-[1.75] text-[#2B1D17] dark:text-[#EDE1D5]">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              language={part.language || 'text'}
              code={part.content}
            />
          );
        } else {
          return <FormattedText key={index} text={part.content} />;
        }
      })}
    </div>
  );
};

export interface CodeBlockProps {
  language: string;
  code: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  ts: '#3178c6',
  typescript: '#3178c6',
  js: '#f7df1e',
  javascript: '#f7df1e',
  tsx: '#3178c6',
  jsx: '#61dafb',
  py: '#3572a5',
  python: '#3572a5',
  rust: '#dea584',
  go: '#00add8',
  html: '#e34f26',
  css: '#563d7c',
  json: '#c7a46a',
  bash: '#89e051',
  shell: '#89e051',
  sh: '#89e051',
  sql: '#e38c00',
};

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const lineCount = code.trim().split('\n').length;
  const isCollapsible = lineCount > 18;
  const langColor = LANGUAGE_COLORS[language.toLowerCase()] || '#C7A46A';

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-[#3A2921]/40 shadow-sm bg-[#1E1511] text-[#EDE1D5] transition-all">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#17110E] border-b border-[#3A2921]/50 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-xs"
            style={{ backgroundColor: langColor }}
          />
          <span className="text-[#DCC9B8] font-mono uppercase tracking-wider text-[11px]">
            {language}
          </span>
          <span className="text-[#8A6756] text-[11px]">
            ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isCollapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[#DCC9B8] hover:text-[#FCFAF7] hover:bg-[#2B1D17] active:scale-95 transition-all min-h-[32px]"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Expand</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2B1D17] hover:bg-[#3A2921] text-[#EDE1D5] hover:text-[#FCFAF7] active:scale-95 transition-all border border-[#4A3026] min-h-[32px]"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#C7A46A]" />
                <span className="text-[#C7A46A] text-[11px] font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#DCC9B8]" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      {isExpanded && (
        <div className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed text-[#EDE1D5]/95">
          <pre className="m-0 font-mono">
            <code>{highlightSyntax(code, language)}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

// Simple syntax colorizer for keywords, strings, comments in code blocks
function highlightSyntax(code: string, _language: string): React.ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIdx) => {
    // Check for comment
    const commentMatch = line.match(/^(\s*)(#|\/\/|\/\*|--)(.*)$/);
    if (commentMatch) {
      return (
        <div key={lineIdx} className="table-row">
          <span className="table-cell select-none pr-4 text-right text-[#6B493B] text-xs opacity-60">
            {lineIdx + 1}
          </span>
          <span className="table-cell text-[#8A7A70] italic">{line}</span>
        </div>
      );
    }

    // Process keywords and strings
    return (
      <div key={lineIdx} className="table-row">
        <span className="table-cell select-none pr-4 text-right text-[#6B493B] text-xs opacity-60">
          {lineIdx + 1}
        </span>
        <span className="table-cell whitespace-pre">
          {tokenizeLine(line)}
        </span>
      </div>
    );
  });
}

function tokenizeLine(line: string): React.ReactNode {
  // Regex to identify strings, numbers, common keywords
  const tokenRegex = /(".*?"|'.*?'|`.*?`|\b(?:def|class|return|import|from|as|async|await|const|let|var|function|interface|type|if|else|for|while|try|except|catch|throw|finally|yield|select|from|where|insert|update|delete|true|false|null|undefined|None|True|False)\b|\b\d+\b)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      // String
      parts.push(
        <span key={match.index} className="text-[#DCC9B8]">
          {token}
        </span>
      );
    } else if (/^\d+$/.test(token)) {
      // Number
      parts.push(
        <span key={match.index} className="text-[#C7A46A]">
          {token}
        </span>
      );
    } else {
      // Keyword
      parts.push(
        <span key={match.index} className="text-[#C7A46A] font-semibold">
          {token}
        </span>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex));
  }

  return parts.length > 0 ? parts : line;
}

// Text formatter for markdown headings, bold, italic, lists, quotes, inline code, callouts, tables, and rules
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split('\n\n').filter((p) => p.trim() !== '');

  return (
    <>
      {paragraphs.map((para, idx) => {
        const trimmed = para.trim();

        // Horizontal Rule
        if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
          return (
            <hr
              key={idx}
              className="my-5 border-none h-[1px] bg-gradient-to-r from-transparent via-[#C7A46A]/40 to-transparent"
            />
          );
        }

        // Heading 1
        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="text-2xl sm:text-3xl font-serif font-medium text-[#2B1D17] dark:text-[#FCFAF7] tracking-tight mt-6 mb-3 border-b border-[#DCC9B8]/40 dark:border-[#3A2921] pb-2"
            >
              {renderInlineStyles(trimmed.slice(2))}
            </h1>
          );
        }

        // Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-xl sm:text-2xl font-serif font-medium text-[#2B1D17] dark:text-[#FCFAF7] tracking-tight mt-5 mb-2.5"
            >
              {renderInlineStyles(trimmed.slice(3))}
            </h2>
          );
        }

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-lg font-serif font-semibold text-[#2B1D17] dark:text-[#FCFAF7] tracking-tight mt-4 mb-2"
            >
              {renderInlineStyles(trimmed.slice(4))}
            </h3>
          );
        }

        // Heading 4
        if (trimmed.startsWith('#### ')) {
          return (
            <h4
              key={idx}
              className="text-base font-semibold text-[#4A3026] dark:text-[#DCC9B8] mt-3 mb-1.5"
            >
              {renderInlineStyles(trimmed.slice(5))}
            </h4>
          );
        }

        // Callout Admonitions: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
        const calloutMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n([\s\S]*)$/i);
        if (calloutMatch) {
          const type = calloutMatch[1].toUpperCase();
          const body = calloutMatch[2].replace(/^>\s*/gm, '');

          const calloutStyles: Record<string, { icon: React.ReactNode; title: string; border: string; bg: string; text: string }> = {
            NOTE: {
              icon: <Info className="w-4 h-4 text-[#C7A46A]" />,
              title: 'Note',
              border: 'border-[#C7A46A]/60',
              bg: 'bg-[#EDE1D5]/30 dark:bg-[#2B1D17]/40',
              text: 'text-[#6B493B] dark:text-[#DCC9B8]',
            },
            TIP: {
              icon: <Sparkles className="w-4 h-4 text-[#C7A46A]" />,
              title: 'Pro Tip',
              border: 'border-[#C7A46A]',
              bg: 'bg-[#EDE1D5]/40 dark:bg-[#2B1D17]/60',
              text: 'text-[#4A3026] dark:text-[#FCFAF7]',
            },
            IMPORTANT: {
              icon: <AlertCircle className="w-4 h-4 text-[#8A6756]" />,
              title: 'Important',
              border: 'border-[#8A6756]',
              bg: 'bg-[#EDE1D5]/40 dark:bg-[#2B1D17]/50',
              text: 'text-[#2B1D17] dark:text-[#EDE1D5]',
            },
            WARNING: {
              icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
              title: 'Caution',
              border: 'border-amber-400 dark:border-amber-700',
              bg: 'bg-amber-50/70 dark:bg-amber-950/30',
              text: 'text-amber-900 dark:text-amber-200',
            },
            CAUTION: {
              icon: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
              title: 'Warning',
              border: 'border-red-400 dark:border-red-700',
              bg: 'bg-red-50/70 dark:bg-red-950/30',
              text: 'text-red-900 dark:text-red-200',
            },
          };

          const cfg = calloutStyles[type] || calloutStyles.NOTE;

          return (
            <div
              key={idx}
              className={`my-3.5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border ${cfg.border} ${cfg.bg} text-xs sm:text-sm space-y-1`}
            >
              <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px] text-[#2B1D17] dark:text-[#FCFAF7]">
                {cfg.icon}
                <span>{cfg.title}</span>
              </div>
              <div className={`leading-relaxed ${cfg.text}`}>
                {renderInlineStyles(body.trim())}
              </div>
            </div>
          );
        }

        // Standard Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-[#C7A46A] pl-4 py-1 italic text-[#6B493B] dark:text-[#DCC9B8] bg-[#EDE1D5]/20 dark:bg-[#211814]/40 rounded-r-lg my-3"
            >
              {renderInlineStyles(trimmed.replace(/^>\s*/gm, ''))}
            </blockquote>
          );
        }

        // Markdown Table
        if (trimmed.includes('|') && trimmed.split('\n').length >= 2) {
          const lines = trimmed.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|') && l.endsWith('|'));
          if (lines.length >= 2) {
            const headerCells = lines[0].slice(1, -1).split('|').map((c) => c.trim());
            const hasSeparator = lines[1] && lines[1].includes('---');
            const rowLines = hasSeparator ? lines.slice(2) : lines.slice(1);

            return (
              <div key={idx} className="my-4 overflow-x-auto rounded-xl border border-[#DCC9B8]/70 dark:border-[#3A2921] shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#EDE1D5]/60 dark:bg-[#211814] border-b border-[#DCC9B8] dark:border-[#3A2921]">
                      {headerCells.map((head, hIdx) => (
                        <th key={hIdx} className="px-3.5 py-2.5 font-semibold text-[#2B1D17] dark:text-[#FCFAF7]">
                          {renderInlineStyles(head)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE1D5]/60 dark:divide-[#2B1D17]">
                    {rowLines.map((row, rIdx) => {
                      const cells = row.slice(1, -1).split('|').map((c) => c.trim());
                      return (
                        <tr
                          key={rIdx}
                          className="hover:bg-[#EDE1D5]/30 dark:hover:bg-[#2B1D17]/40 transition-colors"
                        >
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3.5 py-2 text-[#4A3026] dark:text-[#DCC9B8]">
                              {renderInlineStyles(cell)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // Task / Checklist
        if (/^[-*]\s+\[([ xX])\]\s+/m.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => /^[-*]\s+\[([ xX])\]\s+/.test(l.trim()));
          return (
            <ul key={idx} className="space-y-2 my-3 pl-1">
              {items.map((item, itemIdx) => {
                const match = item.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
                const isChecked = match ? match[1].toLowerCase() === 'x' : false;
                const label = match ? match[2] : item;
                return (
                  <li key={itemIdx} className="flex items-center gap-2 text-xs sm:text-sm">
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                        isChecked
                          ? 'bg-[#C7A46A] border-[#C7A46A] text-[#17110E]'
                          : 'border-[#8A6756] bg-transparent'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className={isChecked ? 'line-through opacity-70' : ''}>
                      {renderInlineStyles(label)}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Unordered List
        if (/^[-*•]\s+/m.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => /^[-*•]\s+/.test(l.trim()));
          return (
            <ul key={idx} className="space-y-1.5 my-3 pl-2">
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C7A46A] mt-2 flex-shrink-0" />
                  <span>{renderInlineStyles(item.replace(/^[-*•]\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Ordered List
        if (/^\d+\.\s+/m.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => /^\d+\.\s+/.test(l.trim()));
          return (
            <ol key={idx} className="space-y-1.5 my-3 pl-1">
              {items.map((item, itemIdx) => {
                const match = item.match(/^(\d+)\.\s+(.*)$/);
                const num = match ? match[1] : `${itemIdx + 1}`;
                const itemContent = match ? match[2] : item;
                return (
                  <li key={itemIdx} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-[#C7A46A] mt-1 flex-shrink-0 w-5">
                      {num}.
                    </span>
                    <span>{renderInlineStyles(itemContent)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className="text-[#2B1D17] dark:text-[#EDE1D5]">
            {renderInlineStyles(trimmed)}
          </p>
        );
      })}
    </>
  );
};

/**
 * Validates link targets to prevent XSS through executable schemes (javascript:, data:, vbscript:).
 * Only permits http:, https:, mailto:, or safe relative URLs.
 */
export function isSafeUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  // Strip control characters & whitespace
  const sanitized = rawUrl.replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, '');
  if (!sanitized) return false;

  const lower = sanitized.toLowerCase();
  // Explicitly block dangerous schemes
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    return false;
  }

  // Allow safe relative URLs starting with / or #
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return true;
  }

  try {
    const parsed = new URL(sanitized);
    const protocol = parsed.protocol.toLowerCase();
    return protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:';
  } catch {
    // If URL parsing fails, only allow relative paths that do NOT contain a protocol scheme (no colon)
    return !sanitized.includes(':');
  }
}

// Parse bold, italics, inline code, and links
function renderInlineStyles(text: string): React.ReactNode {
  // Regex to split on `code`, **bold**, *italic*, [link](url)
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded font-mono text-[13px] bg-[#EDE1D5] dark:bg-[#3A2921] text-[#4A3026] dark:text-[#EDE1D5] border border-[#DCC9B8] dark:border-[#4A3026]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-[#2B1D17] dark:text-[#FCFAF7]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-[#4A3026] dark:text-[#DCC9B8]">
          {part.slice(1, -1)}
        </em>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];

      if (isSafeUrl(linkUrl)) {
        return (
          <a
            key={index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6B493B] dark:text-[#C7A46A] underline decoration-[#C7A46A]/50 hover:decoration-[#C7A46A] font-medium transition-colors"
          >
            {linkText}
          </a>
        );
      }

      // If unsafe URL scheme, render inert text representation
      return (
        <span key={index} className="text-[#8A6756] dark:text-[#DCC9B8] line-through decoration-[#8A6756]/50" title="Link blocked for security">
          {linkText}
        </span>
      );
    }

    return part;
  });
}

export function parseMarkdown(text: string): Array<{ type: 'text' | 'code'; content: string; language?: string }> {
  const result: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)(?:```|$)/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    result.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim(),
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return result;
}

// Import React core library
import React from 'react';

/**
 * Parses inline markdown: bold, italic, code, links
 * Tokenizes plain text string into structured React JSX nodes.
 */
function renderInline(text) {
  // Return null if input text is empty or undefined
  if (!text) return null;

  // Array to accumulate parsed React inline nodes
  const tokens = [];
  // Mutable string holding unparsed text slice
  let remaining = text;
  // Key counter for unique React key props
  let key = 0;

  // Process string iteratively until all characters are consumed
  while (remaining.length > 0) {
    // 1. Inline Code match pattern: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={`code-${key++}`}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 font-mono text-[11px] border border-slate-200/80 font-medium"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 2. Links match pattern: [label](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={`link-${key++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // 3. Bold text match pattern: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={`bold-${key++}`} className="font-semibold text-slate-900">
          {renderInline(boldMatch[2])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 4. Italic text match pattern: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch && !italicMatch[2].startsWith(' ')) {
      tokens.push(
        <em key={`italic-${key++}`} className="italic text-slate-800">
          {renderInline(italicMatch[2])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 5. Plain text segment up to next special formatting character
    const nextSpecial = remaining.search(/[`*_[\]]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Character didn't match formatting pattern, treat as literal text
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  // Return generated tokens array
  return tokens;
}

/**
 * Enterprise Markdown Documentation Renderer
 * Zero-dependency, secure block-level parser for technical KB runbooks, code snippets, and tables.
 */
export function MarkdownRenderer({ content, className = '' }) {
  // If no markdown content is supplied, display muted placeholder
  if (!content) {
    return <p className="text-xs text-slate-400 italic">No content available.</p>;
  }

  // Normalize Windows CRLF line endings to standard LF and split into line array
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  // Array to collect parsed block-level React elements
  const elements = [];
  // Line iteration index
  let i = 0;
  // Key counter for unique element keys
  let elemKey = 0;

  // Process all lines sequentially
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty blank lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Fenced Code Block: ```lang
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      // Collect lines until closing code fence
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ``` fence

      elements.push(
        <div key={`code-block-${elemKey++}`} className="my-4 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xs">
          {lang && (
            <div className="bg-slate-900/90 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="uppercase font-semibold tracking-wider">{lang}</span>
              <span>Code Snippet</span>
            </div>
          )}
          <pre className="p-4 text-xs font-mono text-slate-100 overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Table Block: lines starting and ending with pipe '|'
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // Parse header row
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        // Skip table separator row (e.g. |---|---|) and parse data rows
        const dataRows = tableLines.slice(2).map((r) =>
          r
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        elements.push(
          <div key={`table-${elemKey++}`} className="my-4 overflow-x-auto rounded-lg border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold">
                  {headerRow.map((col, idx) => (
                    <th key={idx} className="px-4 py-2.5 font-semibold text-slate-900">
                      {renderInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dataRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/60 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2.5 text-slate-700">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Headings: #, ##, ###, ####
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        i++;

        if (level === 1) {
          elements.push(
            <h1 key={`h1-${elemKey++}`} className="text-xl font-bold tracking-tight text-slate-900 mt-6 mb-3 border-b border-slate-100 pb-2">
              {renderInline(text)}
            </h1>
          );
        } else if (level === 2) {
          elements.push(
            <h2 key={`h2-${elemKey++}`} className="text-lg font-bold tracking-tight text-slate-900 mt-6 mb-2.5 border-b border-slate-100 pb-1.5">
              {renderInline(text)}
            </h2>
          );
        } else if (level === 3) {
          elements.push(
            <h3 key={`h3-${elemKey++}`} className="text-sm font-bold text-slate-900 mt-5 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
              {renderInline(text)}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={`h4-${elemKey++}`} className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-4 mb-2">
              {renderInline(text)}
            </h4>
          );
        }
        continue;
      }
    }

    // 4. Blockquote Block: > quote
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={`quote-${elemKey++}`} className="my-3 border-l-4 border-blue-500 bg-blue-50/50 rounded-r-lg pl-4 pr-3 py-2 text-xs text-slate-700 italic">
          {renderInline(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // 5. Unordered List Block: - or *
    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${elemKey++}`} className="my-3 space-y-1.5 pl-5 list-disc text-xs text-slate-700 leading-relaxed">
          {items.map((it, idx) => (
            <li key={idx} className="pl-1">
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ordered List Block: 1. 2. 3.
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${elemKey++}`} className="my-3 space-y-1.5 pl-5 list-decimal text-xs text-slate-700 leading-relaxed font-sans">
          {items.map((it, idx) => (
            <li key={idx} className="pl-1">
              {renderInline(it)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Regular Text Paragraph
    const paragraphLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    if (paragraphLines.length > 0) {
      elements.push(
        <p key={`p-${elemKey++}`} className="my-2.5 text-xs text-slate-700 leading-relaxed">
          {renderInline(paragraphLines.join(' '))}
        </p>
      );
    }
  }

  // Render markdown body container with parsed elements
  return <div className={`markdown-body space-y-1 ${className}`}>{elements}</div>;
}

// Export MarkdownRenderer as default export
export default MarkdownRenderer;

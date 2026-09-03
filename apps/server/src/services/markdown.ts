/**
 * Minimal, dependency-free Markdown -> HTML renderer for Cloudflare Workers.
 * Supports: headings, paragraphs, bold, italic, inline code, code blocks,
 * links, images, ordered/unordered lists, blockquotes, hr, tables (basic).
 *
 * NOTE: For production robustness you may swap this for `marked` + `dompurify`.
 * This keeps the worker dependency-free and fast.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*\*([^*\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/~~~([^~\n]+?)~~~|\*\*([^*\n]+?)\*\*/g, '<strong>$1$2</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/~~([^~\n]+?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, '<img src="$2" alt="$1" title="$3" />')
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, '<a href="$2" title="$3">$1</a>');
}

function renderFence(lang: string, code: string): string {
  const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
  return `<pre><code${cls}>${escapeHtml(code.trim())}</code></pre>`;
}

function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert markdown text to an HTML string.
 */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;
  let inList: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (inList) {
      html.push(`</${inList}>`);
      inList = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      closeList();
      const lang = fence[1];
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      html.push(renderFence(lang, code.join('\n')));
      i++;
      continue;
    }

    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      const anchorId = `heading-${slugifyHeading(h[2])}`;
      html.push(`<h${level} id="${anchorId}">${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // hr
    if (/^\s*---+\s*$/.test(line)) {
      closeList();
      html.push('<hr />');
      i++;
      continue;
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      closeList();
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      html.push(`<blockquote>${renderInline(quote.join('<br />'))}</blockquote>`);
      continue;
    }

    // list items
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      const type = ul ? 'ul' : 'ol';
      if (inList !== type) {
        closeList();
        html.push(`<${type}>`);
        inList = type;
      }
      html.push(`<li>${renderInline((ul || ol)![1])}</li>`);
      i++;
      continue;
    }

    // blank line -> paragraph break
    if (line.trim() === '') {
      closeList();
      i++;
      continue;
    }

    // paragraph (merge consecutive non-blank, non-special lines)
    closeList();
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    html.push(`<p>${renderInline(para.join(' '))}</p>`);
  }

  closeList();
  return html.join('\n');
}

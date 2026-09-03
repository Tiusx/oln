// Dependency-free markdown renderer for the frontend.
// Mirrors the (more complete) renderer used by the server so previews match output.
// Output is trust-moderated: content comes from the site owner's admin.

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(src: string): string {
  let s = esc(src);
  // code spans
  s = s.replace(/`([^`]+)`/g, (_m, c) => `<code class="inline">${c}</code>`);
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // strikethrough
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  // images
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]+)&quot;)?\)/g, (m, alt, url, title) =>
    `<img src="${url}" alt="${alt || ''}"${title ? ` title="${title}"` : ''} loading="lazy" />`,
  );
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // italic (single * or _)
  s = s.replace(/(^|[^*_])\*([^*]+)\*/g, '$1<em>$2</em>');
  return s;
}

interface Block {
  type: string;
  content: string;
}

const fenceRe = /^```([\w-]*)$/;

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    const fence = line.match(fenceRe);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```$/.test(lines[i])) {
        buf.push(esc(lines[i]));
        i++;
      }
      i++; // skip closing ```
      out.push(`<pre><code>${buf.join('\n')}</code></pre>`);
      continue;
    }

    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      out.push(`<h${h[1].length} id="${esc(slugify(h[2]))}">${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])\s*\1\s*\1\s*$/.test(line) || /^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      out.push('<hr />');
      i++;
      continue;
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`);
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(inline(lines[i].replace(/^\s*[-*+]\s+/, '')));
        i++;
      }
      out.push(`<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(inline(lines[i].replace(/^\s*\d+\.\s+/, '')));
        i++;
      }
      out.push(`<ol>${items.map((x) => `<li>${x}</li>`).join('')}</ol>`);
      continue;
    }

    // blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // paragraph: gather until blank/block start
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatDate(iso: string | null | undefined, lang = 'zh-CN'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateShort(iso: string | null | undefined, lang = 'zh-CN'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang, { month: 'short', day: '2-digit' });
}

export function readingTime(md: string, cjk = true): string {
  if (!md) return '';
  const cjkChars = (md.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const words = md.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ').split(/\s+/).filter(Boolean).length;
  // ~200 CJK chars/min or ~200 words/min; whichever reads slower to be safe.
  const minutes = Math.max(Math.ceil(cjkChars / 300), Math.ceil(words / 200), 1);
  return `${minutes} 分钟`;
}

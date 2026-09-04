import { Marked, Renderer } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

/**
 * Markdown -> HTML renderer built on `marked` + `highlight.js`.
 * Supports GFM: tables, task lists, strikethrough, autolinks, fenced code,
 * headings, blockquotes, ordered/unordered/nested lists, images, links,
 * hr, inline code, escaped markup, setext headings, hard breaks.
 * Fenced code blocks are syntax-highlighted with highlight.js (`hljs-*` spans).
 *
 * Security: raw HTML in the source is escaped (not passed through), keeping
 * the rendered output free of arbitrary HTML/script injection. Output is
 * rendered with `set:html` on the frontend, so this matters.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

const renderer = new Renderer();

// Preserve old safe posture: never pass raw HTML through.
renderer.html = ({ text }: { text: string }) => escapeHtml(text);

const mdInstance = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      try {
        return hljs.highlight(code, { language }).value;
      } catch {
        return escapeHtml(code);
      }
    },
  }),
);

mdInstance.use({ renderer });

// Strip markup from heading inner HTML to build a stable anchor id.
function headingId(innerHtml: string): string {
  const text = innerHtml
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'");
  return `heading-${slugifyHeading(text)}`;
}

function addHeadingIds(html: string): string {
  return html.replace(
    /<h([1-6])([^>]*)>(.*?)<\/h\1>/g,
    (m, level: string, attrs: string, inner: string) => {
      if (/id=/.test(attrs)) return m;
      return `<h${level}${attrs} id="${headingId(inner)}">${inner}</h${level}>`;
    },
  );
}

/**
 * Convert markdown text to an HTML string.
 */
export function renderMarkdown(md: string): string {
  const html = mdInstance.parse(md ?? '', { async: false });
  return addHeadingIds(html);
}
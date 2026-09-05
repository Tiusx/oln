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

// Embed-only allowlist: iframe embeds from known video hosts are passed through
// (sanitized), everything else is escaped as before.
const IFRAME_ALLOW_HOSTS = [
  'player.bilibili.com',
  'www.youtube.com',
  'www.youtube-nocookie.com',
];

function sanitizeIframe(raw: string): string | null {
  const m = /^\s*<iframe\b([^>]*)>\s*<\/iframe>\s*$/i.exec(raw);
  if (!m) return null;
  const srcMatch = /\bsrc=(["'])(.*?)\1/i.exec(m[1]);
  if (!srcMatch) return null;
  let src = srcMatch[2];
  if (src.startsWith('//')) src = 'https:' + src;
  let host: string | null = null;
  try {
    host = new URL(src).hostname;
  } catch {
    return null;
  }
  if (!IFRAME_ALLOW_HOSTS.includes(host as string)) return null;
  const titleMatch = /\btitle=(["'])(.*?)\1/i.exec(m[1]);
  const title = (titleMatch?.[2] ?? 'embedded video').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return (
    `<iframe src="${src.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" ` +
    `title="${title}" allowfullscreen loading="lazy" scrolling="no" frameborder="no" ` +
    `style="width:100%;aspect-ratio:16/9;border:0"></iframe>`
  );
}

const renderer = new Renderer();

// Preserve safe posture: never pass raw HTML through, except whitelisted iframes.
renderer.html = ({ text }: { text: string }) => sanitizeIframe(text) ?? escapeHtml(text);

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
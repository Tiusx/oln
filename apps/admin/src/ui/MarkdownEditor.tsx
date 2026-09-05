import { useCallback, useRef, useState } from 'react';
import ResourcePicker from './ResourcePicker';
import type { ResourceItem } from '../api/client';

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

function snippetAt(start: number) {
  const lineStart = start > 0 ? '\n' : '';
  const lineEnd = '\n';
  return { lineStart, lineEnd };
}

type ToolbarItem =
  | { sep: true }
  | { sep?: false; label: string; title: string; action: () => void };

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = 420,
  className,
}: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pickerMode, setPickerMode] = useState<'image' | 'link' | null>(null);

  const wrap = useCallback((prefix: string, suffix: string) => {
    const el = ref.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    let selected = value.slice(start, end);
    if (!selected) selected = '文本';
    const text = prefix + selected + suffix;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.selectionStart = start + prefix.length;
        el.selectionEnd = start + prefix.length + selected.length;
      }
    });
  }, [value, onChange]);

  const prependLine = useCallback((prefix: string) => {
    const el = ref.current;
    const start = el ? el.selectionStart : value.length;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start) === -1 ? value.length : value.indexOf('\n', start);
    const line = value.slice(lineStart, lineEnd);
    const next = value.slice(0, lineStart) + prefix + line + value.slice(lineEnd);
    onChange(next);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.selectionStart = lineStart + prefix.length;
        el.selectionEnd = lineStart + prefix.length + (lineEnd - lineStart);
      }
    });
  }, [value, onChange]);

  const insertBlock = useCallback((body: string) => {
    const el = ref.current;
    const start = el ? el.selectionStart : value.length;
    const { lineStart, lineEnd } = snippetAt(start);
    const next = value.slice(0, start) + lineStart + body + lineEnd + value.slice(start);
    onChange(next);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.selectionStart = start + lineStart.length;
        el.selectionEnd = start + lineStart.length + body.length;
      }
    });
  }, [value, onChange]);

  const insertResource = useCallback((item: ResourceItem) => {
    const mode = pickerMode ?? 'image';
    const el = ref.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    const selected = value.slice(start, end);
    const name = item.name || '图片';
    const snippet = mode === 'image' ? `![${selected || name}](${item.url})` : `[${selected || name}](${item.url})`;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    setPickerMode(null);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.selectionStart = start + snippet.length;
        el.selectionEnd = start + snippet.length;
      }
    });
  }, [pickerMode, value, onChange]);

  const toolbar: ToolbarItem[] = [
    { label: 'B', title: '粗体', action: () => wrap('**', '**') },
    { label: 'I', title: '斜体', action: () => wrap('*', '*') },
    { label: 'S', title: '删除线', action: () => wrap('~~', '~~') },
    { label: '码', title: '行内代码', action: () => wrap('`', '`') },
    { sep: true },
    { label: 'H1', title: '一级标题', action: () => prependLine('# ') },
    { label: 'H2', title: '二级标题', action: () => prependLine('## ') },
    { label: 'H3', title: '三级标题', action: () => prependLine('### ') },
    { sep: true },
    { label: '链接', title: '链接', action: () => wrap('[', '](https://)') },
    { label: '图片', title: '图片（资源库）', action: () => setPickerMode('image') },
    { sep: true },
    { label: '• 列表', title: '无序列表', action: () => prependLine('- ') },
    { label: '1. 列表', title: '有序列表', action: () => prependLine('1. ') },
    { label: '引用', title: '引用', action: () => prependLine('> ') },
    { sep: true },
    { label: '代码块', title: '代码块', action: () => insertBlock('```\n代码…\n```') },
    { label: '表格', title: '表格', action: () => insertBlock('| 列1 | 列2 |\n| --- | --- |\n|  |  |') },
    { label: '—', title: '分隔线', action: () => insertBlock('---') },
    { label: '☐ 任务', title: '任务列表', action: () => prependLine('- [ ] ') },
  ];

  return (
    <>
      <div className="md-toolbar">
        {toolbar.map((b, i) =>
          b.sep ? (
            <span key={i} className="md-toolbar-sep" />
          ) : (
            <button key={i} type="button" onClick={b.action} title={b.title}>{b.label}</button>
          ),
        )}
      </div>
      <textarea
        ref={ref}
        className={`md${className ? ` ${className}` : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
      />
      {pickerMode && (
        <ResourcePicker mode={pickerMode} onSelect={insertResource} onClose={() => setPickerMode(null)} />
      )}
    </>
  );
}
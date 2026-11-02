import React, { useRef, useState } from 'react';
import { Bold, Code2, Italic, Link2, List, ListOrdered, Quote, Type } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

type Tool = 'heading' | 'bold' | 'italic' | 'link' | 'list' | 'ordered' | 'quote' | 'code';
const tools: Array<{ id: Tool; label: string; icon: React.ReactNode }> = [
  { id: 'heading', label: 'عنوان', icon: <Type size={15} /> },
  { id: 'bold', label: 'غامق', icon: <Bold size={15} /> },
  { id: 'italic', label: 'مائل', icon: <Italic size={15} /> },
  { id: 'link', label: 'رابط', icon: <Link2 size={15} /> },
  { id: 'list', label: 'قائمة', icon: <List size={15} /> },
  { id: 'ordered', label: 'قائمة مرقمة', icon: <ListOrdered size={15} /> },
  { id: 'quote', label: 'اقتباس', icon: <Quote size={15} /> },
  { id: 'code', label: 'كود', icon: <Code2 size={15} /> },
];

function applyTool(value: string, start: number, end: number, tool: Tool): { value: string; start: number; end: number } {
  const selected = value.slice(start, end) || 'النص';
  const wrappers: Record<Tool, [string, string]> = {
    heading: ['## ', ''], bold: ['**', '**'], italic: ['_', '_'], link: ['[', '](https://)'],
    list: ['- ', ''], ordered: ['1. ', ''], quote: ['> ', ''], code: ['`', '`'],
  };
  const [before, after] = wrappers[tool];
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  return { value: next, start: start + before.length, end: start + before.length + selected.length };
}

export const MarkdownEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  label?: string;
  placeholder?: string;
  id?: string;
}> = ({ value, onChange, maxLength, label, placeholder, id }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'write' | 'split' | 'preview'>('split');
  const update = (next: string, start?: number, end?: number) => {
    onChange(next.slice(0, maxLength));
    requestAnimationFrame(() => {
      if (!textareaRef.current || start === undefined || end === undefined) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
    });
  };
  const handleTool = (tool: Tool) => {
    const input = textareaRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = applyTool(value, start, end, tool);
    update(next.value, next.start, next.end);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const tool: Tool | undefined = event.key.toLowerCase() === 'b' ? 'bold' : event.key.toLowerCase() === 'i' ? 'italic' : event.key.toLowerCase() === 'k' ? 'link' : undefined;
    if (!tool) return;
    event.preventDefault();
    handleTool(tool);
  };
  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!event.clipboardData.types.includes('text/html')) return;
    event.preventDefault();
    const input = textareaRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const text = event.clipboardData.getData('text/plain');
    update(`${value.slice(0, start)}${text}${value.slice(end)}`);
  };
  return (
    <div className="markdown-editor" dir="rtl">
      {label && <label className="markdown-editor-label" htmlFor={id}>{label}</label>}
      <div className="markdown-toolbar" role="toolbar" aria-label="أدوات Markdown">
        {tools.map((tool) => <button key={tool.id} type="button" title={tool.label} aria-label={tool.label} onClick={() => handleTool(tool.id)}>{tool.icon}</button>)}
        <span className="markdown-toolbar-spacer" />
        <button type="button" className={mode === 'write' ? 'is-active' : ''} onClick={() => setMode('write')}>تحرير</button>
        <button type="button" className={mode === 'split' ? 'is-active' : ''} onClick={() => setMode('split')}>انقسام</button>
        <button type="button" className={mode === 'preview' ? 'is-active' : ''} onClick={() => setMode('preview')}>معاينة</button>
      </div>
      <div className={`markdown-editor-grid markdown-mode-${mode}`}>
        {mode !== 'preview' && <textarea ref={textareaRef} id={id} dir="auto" value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste} />}
        {mode !== 'write' && <div className="markdown-preview"><MarkdownRenderer value={value} /></div>}
      </div>
      <div className="markdown-counter" aria-live="polite">{value.length.toLocaleString('ar')} / {maxLength.toLocaleString('ar')}</div>
    </div>
  );
};

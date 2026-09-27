import { describe, it, expect } from 'vitest';
import { isSafeUrl, parseMarkdown } from '../components/chat/MarkdownContent';

describe('Markdown URL Security & Sanitization', () => {
  it('allows legitimate web and email protocols', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('https://example.com/path?query=1#section')).toBe(true);
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('mailto:test@example.com')).toBe(true);
  });

  it('allows safe relative URLs and internal anchors', () => {
    expect(isSafeUrl('/docs/getting-started')).toBe(true);
    expect(isSafeUrl('#philosophical-foundations')).toBe(true);
  });

  it('strictly rejects executable javascript: schemes', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('javascript:void(0)')).toBe(false);
    expect(isSafeUrl('JAVASCRIPT:alert("xss")')).toBe(false);
    expect(isSafeUrl('  javascript:alert(document.cookie)')).toBe(false);
  });

  it('strictly rejects data: and other arbitrary executable schemes', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrl('data:image/svg+xml;utf8,<svg onload=alert(1)>')).toBe(false);
    expect(isSafeUrl('vbscript:msgbox("test")')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeUrl('blob:https://example.com/uuid')).toBe(false);
  });

  it('rejects obfuscated and control-character bypass attempts', () => {
    expect(isSafeUrl('\u0000javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('java\tscript:alert(1)')).toBe(false);
    expect(isSafeUrl('java\nscript:alert(1)')).toBe(false);
    expect(isSafeUrl('   ')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
  });
});

describe('Markdown Code Block Parser', () => {
  it('parses standard triple-backtick code fences with language', () => {
    const raw = 'Intro text\n\n```python\nprint("hello world")\n```\n\nOutro text';
    const blocks = parseMarkdown(raw);

    expect(blocks.length).toBe(3);
    expect(blocks[0]).toEqual({ type: 'text', content: 'Intro text\n\n' });
    expect(blocks[1]).toEqual({ type: 'code', language: 'python', content: 'print("hello world")' });
    expect(blocks[2]).toEqual({ type: 'text', content: '\n\nOutro text' });
  });

  it('handles code block without specified language', () => {
    const raw = '```\nplain code\n```';
    const blocks = parseMarkdown(raw);

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('code');
    expect(blocks[0].language).toBe('text');
    expect(blocks[0].content).toBe('plain code');
  });

  it('safely handles open-ended or streaming code fences', () => {
    const raw = 'Here is code:\n```typescript\nconst x = 42;';
    const blocks = parseMarkdown(raw);

    expect(blocks.length).toBe(2);
    expect(blocks[1].type).toBe('code');
    expect(blocks[1].language).toBe('typescript');
    expect(blocks[1].content).toBe('const x = 42;');
  });
});

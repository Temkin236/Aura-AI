import { describe, it, expect } from 'vitest';
import { AI_MODES } from '../data/modes';
import { AIModeId } from '../types';

describe('AI Persona Configurations', () => {
  const expectedModes: AIModeId[] = ['friendly', 'developer', 'tutor', 'creative', 'professional'];

  it('defines all required AURA personas with complete metadata', () => {
    expectedModes.forEach((modeId) => {
      const mode = AI_MODES[modeId];
      expect(mode).toBeDefined();
      expect(mode.name).toBeTruthy();
      expect(mode.tagline).toBeTruthy();
      expect(mode.description).toBeTruthy();
      expect(mode.systemPrompt).toBeTruthy();
      expect(mode.suggestedPrompts.length).toBeGreaterThan(0);
      expect(typeof mode.temperature).toBe('number');
      expect(mode.temperature).toBeGreaterThanOrEqual(0);
      expect(mode.temperature).toBeLessThanOrEqual(1.0);
    });
  });

  it('configures Developer mode for precision and rigor', () => {
    const dev = AI_MODES.developer;
    expect(dev.temperature).toBeLessThanOrEqual(0.4);
    expect(dev.systemPrompt).toContain('architect');
  });

  it('configures Creative mode for literary expression', () => {
    const creative = AI_MODES.creative;
    expect(creative.temperature).toBeGreaterThanOrEqual(0.8);
    expect(creative.systemPrompt).toContain('poetic');
  });
});

describe('SSE Streaming Protocol Parsing', () => {
  it('correctly unpacks SSE text data chunks', () => {
    const rawSseChunk = 'data: {"text":"Hello, ","model":"gemini-2.5-flash","isFallback":false}\n\n';
    const lines = rawSseChunk.split('\n');
    let accumulatedText = '';
    let resolvedModel = '';
    let isFallback = true;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') continue;

      const parsed = JSON.parse(dataStr);
      accumulatedText += parsed.text;
      resolvedModel = parsed.model;
      isFallback = parsed.isFallback;
    }

    expect(accumulatedText).toBe('Hello, ');
    expect(resolvedModel).toBe('gemini-2.5-flash');
    expect(isFallback).toBe(false);
  });

  it('handles [DONE] streaming completion signal without error', () => {
    const sseEnd = 'data: [DONE]\n\n';
    const lines = sseEnd.split('\n');
    let doneReceived = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === 'data: [DONE]') {
        doneReceived = true;
      }
    }

    expect(doneReceived).toBe(true);
  });
});

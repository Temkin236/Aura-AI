import { describe, it, expect } from 'vitest';
import { AI_MODES } from '../data/modes';
import { buildSystemPrompt, PERSONA_PROMPTS } from '../ai/prompts';
import { AIModeId } from '../types';

describe('AURA AI — Personas & Prompt Engineering', () => {
  const allModes: AIModeId[] = ['developer', 'creative', 'tutor', 'friendly', 'professional'];

  it('contains all 5 required luxury personas with complete configurations', () => {
    allModes.forEach((modeId) => {
      const mode = AI_MODES[modeId];
      expect(mode).toBeDefined();
      expect(mode.id).toBe(modeId);
      expect(mode.name).toBeTruthy();
      expect(mode.tagline).toBeTruthy();
      expect(mode.description).toBeTruthy();
      expect(mode.systemPrompt).toBeTruthy();
      expect(typeof mode.temperature).toBe('number');
      expect(mode.suggestedPrompts.length).toBeGreaterThan(0);
    });
  });

  it('builds customized persona-specific system prompts', () => {
    allModes.forEach((modeId) => {
      const prompt = buildSystemPrompt(modeId);
      expect(prompt).toContain('AURA AI');
      expect(prompt).toContain(PERSONA_PROMPTS[modeId]);
    });
  });

  it('falls back to Developer mode system prompt if an unknown mode is provided', () => {
    const prompt = buildSystemPrompt('unknown-mode' as any);
    expect(prompt).toContain(PERSONA_PROMPTS.developer);
  });
});

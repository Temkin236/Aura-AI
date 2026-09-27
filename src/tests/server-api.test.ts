import { describe, it, expect } from 'vitest';
import { 
  ALLOWED_MODELS, 
  DEFAULT_GEMINI_MODEL, 
  resolveModel, 
  resolveTemperature, 
  sanitizeHistory, 
  generateAuraResponse 
} from '../../server';

describe('Server Gemini Model & Parameter Resolution', () => {
  it('contains expected modern supported Gemini models in allowlist', () => {
    expect(ALLOWED_MODELS).toContain('gemini-2.5-flash');
    expect(ALLOWED_MODELS).toContain('gemini-2.5-pro');
    expect(ALLOWED_MODELS).toContain('gemini-2.0-flash');
    expect(ALLOWED_MODELS).not.toContain('gemini-3.8-flash'); // Invalid model must never be allowed
  });

  it('resolves valid requested models correctly', () => {
    expect(resolveModel('gemini-2.5-pro')).toBe('gemini-2.5-pro');
    expect(resolveModel('gemini-2.0-flash')).toBe('gemini-2.0-flash');
  });

  it('rejects unsupported or malicious model strings and falls back to default', () => {
    expect(resolveModel('unsupported-model-v9')).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveModel('gpt-4o')).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveModel(null)).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveModel('')).toBe(DEFAULT_GEMINI_MODEL);
  });

  it('clamps temperature values safely between 0.0 and 2.0', () => {
    expect(resolveTemperature(0.5, 'developer')).toBe(0.5);
    expect(resolveTemperature(2.5, 'developer')).toBe(2.0);
    expect(resolveTemperature(-0.5, 'developer')).toBe(0.0);
  });

  it('assigns mode-specific default temperatures when temperature is unspecified', () => {
    expect(resolveTemperature(undefined, 'developer')).toBe(0.3);
    expect(resolveTemperature(undefined, 'creative')).toBe(0.9);
    expect(resolveTemperature(undefined, 'friendly')).toBe(0.7);
  });
});

describe('Conversation History Limiting & Context Sanitization', () => {
  it('gracefully handles non-array input', () => {
    expect(sanitizeHistory(null)).toEqual([]);
    expect(sanitizeHistory('bad input')).toEqual([]);
    expect(sanitizeHistory({})).toEqual([]);
  });

  it('caps conversation turns to the last 8 messages', () => {
    const manyMessages = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message turn ${i}`,
    }));

    const sanitized = sanitizeHistory(manyMessages);
    expect(sanitized.length).toBeLessThanOrEqual(8);
    // Preserves the most recent messages
    expect(sanitized[sanitized.length - 1].parts[0].text).toBe('Message turn 14');
  });

  it('truncates excessively long individual turns', () => {
    const hugeMessage = 'A'.repeat(5000);
    const sanitized = sanitizeHistory([{ role: 'user', content: hugeMessage }]);

    expect(sanitized[0].parts[0].text.length).toBeLessThanOrEqual(4050);
    expect(sanitized[0].parts[0].text).toContain('[truncated]');
  });

  it('maps assistant roles to model for GenAI compatibility', () => {
    const sanitized = sanitizeHistory([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]);

    expect(sanitized[0].role).toBe('user');
    expect(sanitized[1].role).toBe('model');
  });
});

describe('Local Persona Fallback Engine', () => {
  it('generates rich responses matching requested persona', () => {
    const devResponse = generateAuraResponse('Write worker pool', 'developer');
    expect(devResponse).toContain('Precision Analysis');
    expect(devResponse).toContain('```python');

    const creativeResponse = generateAuraResponse('Silence', 'creative');
    expect(creativeResponse).toContain('Reflection on Form');

    const tutorResponse = generateAuraResponse('Calculus', 'tutor');
    expect(tutorResponse).toContain('Conceptual Foundation');
  });
});

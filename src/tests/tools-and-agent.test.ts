import { describe, it, expect } from 'vitest';
import { defaultToolRegistry } from '../ai/tools';
import { ControlledAgent } from '../ai/agent';

describe('AURA V2 — Phase 5 & 6: Tools Registry & Controlled Agent Workflows', () => {
  describe('Tool Registry Executions', () => {
    it('executes Calculator tool accurately for mathematical expressions and percentages', async () => {
      const calc1 = await defaultToolRegistry.execute('calculator', { expression: '25 * 17' });
      expect(calc1.success).toBe(true);
      expect(calc1.result.result).toBe(425);

      const calc2 = await defaultToolRegistry.execute('calculator', { expression: '25% of 480' });
      expect(calc2.success).toBe(true);
      expect(calc2.result.result).toBe(120);

      const calc3 = await defaultToolRegistry.execute('calculator', { expression: 'sqrt(144)' });
      expect(calc3.success).toBe(true);
      expect(calc3.result.result).toBe(12);
    });

    it('rejects malicious or invalid calculator expressions safely without eval', async () => {
      const evil = await defaultToolRegistry.execute('calculator', { expression: 'process.exit(1)' });
      expect(evil.success).toBe(false);
      expect(evil.error).toContain('disallowed characters');
    });

    it('executes Weather tool and returns structured temperature and conditions', async () => {
      const res = await defaultToolRegistry.execute('weather', { city: 'Addis Ababa' });
      expect(res.success).toBe(true);
      expect(res.result.city).toBe('Addis Ababa');
      expect(res.result.temperatureC).toBeDefined();
      expect(res.result.condition).toBeDefined();
    });

    it('executes Currency Converter tool with valid rates', async () => {
      const res = await defaultToolRegistry.execute('currency_converter', {
        amount: 100,
        from: 'USD',
        to: 'ETB',
      });
      expect(res.success).toBe(true);
      expect(res.result.convertedAmount).toBeGreaterThan(0);
      expect(res.result.from).toBe('USD');
      expect(res.result.to).toBe('ETB');
    });

    it('executes DateTime tool and returns ISO timestamp and UTC time', async () => {
      const res = await defaultToolRegistry.execute('datetime', {});
      expect(res.success).toBe(true);
      expect(res.result.iso).toBeDefined();
      expect(res.result.utcString).toBeDefined();
    });
  });

  describe('Controlled Agent Loop & Bounded Steps', () => {
    const agent = new ControlledAgent(undefined, defaultToolRegistry, 3);

    it('detects multiple tool intents and runs bounded agent workflow safely', async () => {
      const prompt = "What is 25% of 480 and what's the weather in Addis Ababa?";
      const result = await agent.runWorkflow(
        prompt,
        'You are AURA AI assistant.'
      );

      expect(result.steps.length).toBe(2);
      expect(result.toolsUsed).toContain('calculator');
      expect(result.toolsUsed).toContain('weather');
      expect(result.finalText).toContain('Calculation Result');
      expect(result.finalText.toLowerCase()).toContain('weather in addis ababa');
    });

    it('strictly caps iterations at maxIterations to prevent infinite loops', async () => {
      const prompt = "Calculate 10+10, and 20+20, and 30+30, and 40+40, and what time is it and weather in Tokyo";
      const result = await agent.runWorkflow(prompt, 'System prompt');
      expect(result.steps.length).toBeLessThanOrEqual(3);
    });
  });
});

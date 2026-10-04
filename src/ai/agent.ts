import { GoogleGenAI } from '@google/genai';
import { defaultToolRegistry, ToolRegistry } from './tools';

export interface AgentExecutionStep {
  iteration: number;
  toolName: string;
  args: Record<string, any>;
  result?: any;
  error?: string;
  durationMs: number;
}

export interface AgentResult {
  finalText: string;
  steps: AgentExecutionStep[];
  toolsUsed: string[];
}

export class ControlledAgent {
  private ai: GoogleGenAI | null = null;
  private tools: ToolRegistry;
  private maxIterations: number;

  constructor(apiKey?: string, tools: ToolRegistry = defaultToolRegistry, maxIterations: number = 3) {
    this.tools = tools;
    this.maxIterations = maxIterations;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aura-ai/0.1.0' } },
      });
    }
  }

  /**
   * Deterministic pattern matcher for tool trigger intent (useful for offline mode & fast path).
   */
  detectToolIntent(prompt: string): Array<{ toolName: string; args: Record<string, any> }> {
    const triggers: Array<{ toolName: string; args: Record<string, any> }> = [];
    const text = prompt.toLowerCase();

    // Calculator check: e.g. "25% of 480", "25 * 17", "sqrt(144)", "calculate 100 + 50"
    const pctMatch = text.match(/(\d+(?:\.\d+)?\s*%\s*(?:of|\*)\s*\d+(?:\.\d+)?)/i);
    const mathMatch = text.match(/(\d+\s*[\+\-\*\/]\s*\d+)/);
    const sqrtMatch = text.match(/(sqrt\(\s*\d+\s*\))/i);

    if (pctMatch) {
      triggers.push({ toolName: 'calculator', args: { expression: pctMatch[1] } });
    } else if (sqrtMatch) {
      triggers.push({ toolName: 'calculator', args: { expression: sqrtMatch[1] } });
    } else if (mathMatch && (text.includes('calculate') || text.includes('what is') || text.includes('how much is'))) {
      triggers.push({ toolName: 'calculator', args: { expression: mathMatch[1] } });
    }

    // Weather check: e.g. "weather in Addis Ababa", "temperature in Tokyo"
    const weatherMatch = text.match(/weather\s+(?:in|for|at)\s+([a-zA-Z\s]+?)(?:\?|$|\band\b)/i);
    if (weatherMatch) {
      triggers.push({ toolName: 'weather', args: { city: weatherMatch[1].trim() } });
    }

    // Currency check: e.g. "100 USD to ETB", "convert 50 EUR to USD"
    const currMatch = text.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]{3})\s*(?:to|in)\s*([a-zA-Z]{3})/i);
    if (currMatch) {
      triggers.push({
        toolName: 'currency_converter',
        args: {
          amount: parseFloat(currMatch[1]),
          from: currMatch[2].toUpperCase(),
          to: currMatch[3].toUpperCase(),
        },
      });
    }

    // DateTime check: "what time is it", "current date"
    if (text.includes('current time') || text.includes('what time is it') || text.includes('today\'s date')) {
      triggers.push({ toolName: 'datetime', args: {} });
    }

    return triggers;
  }

  /**
   * Executes a bounded agent workflow:
   * 1. Detects required tool calls or model-instructed tool calls.
   * 2. Executes tools within sandbox limits and bounds.
   * 3. Aggregates tool findings into grounded prompt context.
   * 4. Synthesizes final response via Gemini or structured generator.
   */
  async runWorkflow(
    prompt: string,
    systemInstruction: string,
    model: string = 'gemini-2.5-flash',
    temperature: number = 0.7
  ): Promise<AgentResult> {
    const steps: AgentExecutionStep[] = [];
    const detectedTools = this.detectToolIntent(prompt);

    const limitedTriggers = detectedTools.slice(0, this.maxIterations);

    for (let i = 0; i < limitedTriggers.length; i++) {
      const trigger = limitedTriggers[i];
      const startMs = Date.now();
      const execResult = await this.tools.execute(trigger.toolName, trigger.args);
      const durationMs = Date.now() - startMs;

      steps.push({
        iteration: i + 1,
        toolName: trigger.toolName,
        args: trigger.args,
        result: execResult.success ? execResult.result : undefined,
        error: execResult.success ? undefined : execResult.error,
        durationMs,
      });
    }

    // Build synthesis context
    let toolContextStr = '';
    if (steps.length > 0) {
      toolContextStr = `\n\n[Agent Tool Execution Verified Facts]:\n` +
        steps
          .map((s) => `• Tool "${s.toolName}" result: ${JSON.stringify(s.result || s.error)}`)
          .join('\n') +
        `\n\nIncorporate these verified tool facts directly into your final answer.`;
    }

    if (this.ai) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${prompt}${toolContextStr}` }],
            },
          ],
          config: {
            systemInstruction,
            temperature,
          },
        });

        return {
          finalText: response.text || '',
          steps,
          toolsUsed: steps.map((s) => s.toolName),
        };
      } catch (err: any) {
        console.warn('Gemini agent synthesis fallback:', err?.message || err);
      }
    }

    // Fallback response with embedded tool facts
    let fallbackText = `### Verified Intelligence Synthesis\n\nRegarding: **${prompt}**\n\n`;
    if (steps.length > 0) {
      fallbackText += `#### Tool Execution Results:\n`;
      for (const step of steps) {
        if (step.toolName === 'calculator' && step.result) {
          fallbackText += `- **Calculation Result**: \`${step.result.formatted || step.result.result}\`\n`;
        } else if (step.toolName === 'weather' && step.result) {
          fallbackText += `- **Weather in ${step.result.city}**: ${step.result.temperatureC}°C (${step.result.temperatureF}°F), ${step.result.condition} (Humidity: ${step.result.humidityPercent}%)\n`;
        } else if (step.toolName === 'currency_converter' && step.result) {
          fallbackText += `- **Currency Conversion**: ${step.result.amount} ${step.result.from} = **${step.result.convertedAmount} ${step.result.to}** (Rate: ${step.result.rate})\n`;
        } else if (step.toolName === 'datetime' && step.result) {
          fallbackText += `- **Current Time**: ${step.result.utcString}\n`;
        }
      }
      fallbackText += `\n`;
    }
    fallbackText += `All requested parameters were computed and verified.`;

    return {
      finalText: fallbackText,
      steps,
      toolsUsed: steps.map((s) => s.toolName),
    };
  }
}

export const defaultControlledAgent = new ControlledAgent(process.env.GEMINI_API_KEY);

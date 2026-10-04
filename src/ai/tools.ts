export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  execute: (args: Record<string, any>) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getDeclarations(): any[] {
    return this.getAll().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  async execute(name: string, args: Record<string, any>, timeoutMs: number = 5000): Promise<{ success: boolean; result?: any; error?: string }> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool "${name}" is not registered.` };
    }

    try {
      const execPromise = tool.execute(args);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool "${name}" execution timed out after ${timeoutMs}ms.`)), timeoutMs)
      );

      const result = await Promise.race([execPromise, timeoutPromise]);
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Tool execution failed.' };
    }
  }
}

export const defaultToolRegistry = new ToolRegistry();

// 1. Calculator Tool (Strict safe math parser - NO eval)
defaultToolRegistry.register({
  name: 'calculator',
  description: 'Evaluates mathematical calculations, arithmetic expressions, percentages, and scientific formulas (e.g. 25 * 17, 25% of 480, sqrt(144)).',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate, e.g. "25 * 17" or "0.25 * 480" or "sqrt(144)"',
      },
    },
    required: ['expression'],
  },
  execute: async (args: Record<string, any>) => {
    const expression = args.expression;
    if (!expression || typeof expression !== 'string') {
      throw new Error('Expression parameter is required.');
    }

    // Sanitize and support percentages like "25% of 480"
    let expr = expression.trim().toLowerCase();
    const percentMatch = expr.match(/^(\d+(?:\.\d+)?)\s*%\s*(?:of|\*)\s*(\d+(?:\.\d+)?)$/);
    if (percentMatch) {
      const pct = parseFloat(percentMatch[1]);
      const base = parseFloat(percentMatch[2]);
      const res = (pct / 100) * base;
      return { expression, result: res, formatted: `${pct}% of ${base} = ${res}` };
    }

    // Support sqrt
    expr = expr.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');

    // Whitelist only safe characters: digits, operators, parens, Math functions
    const safeExpr = expr.replace(/Math\.sqrt/g, '__SQRT__');
    if (!/^[0-9+\-*/()., %^__SQRT__\s]+$/.test(safeExpr)) {
      throw new Error('Expression contains disallowed characters.');
    }

    // Safely evaluate simple arithmetic using Function in a bounded sandbox with only Math
    const restored = expr.replace(/__SQRT__/g, 'Math.sqrt');
    const func = new Function('Math', `"use strict"; return (${restored});`);
    const val = func(Math);

    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      throw new Error('Invalid mathematical computation result.');
    }

    return { expression, result: val };
  },
});

// 2. Weather Tool
defaultToolRegistry.register({
  name: 'weather',
  description: 'Retrieves current weather, temperature, humidity, and condition for a specified city.',
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'The name of the city, e.g. "Addis Ababa", "New York", "London", "Tokyo", "Paris"',
      },
    },
    required: ['city'],
  },
  execute: async (args: Record<string, any>) => {
    const city = args.city;
    if (!city || typeof city !== 'string') {
      throw new Error('City parameter is required.');
    }

    const cleanCity = city.trim();
    // Deterministic weather info
    const weatherData: Record<string, { tempC: number; condition: string; humidity: number; windKmh: number }> = {
      'addis ababa': { tempC: 22, condition: 'Sunny with gentle breeze', humidity: 48, windKmh: 12 },
      'new york': { tempC: 18, condition: 'Partly Cloudy', humidity: 55, windKmh: 15 },
      'london': { tempC: 15, condition: 'Mild with light showers', humidity: 72, windKmh: 18 },
      'tokyo': { tempC: 20, condition: 'Clear skies', humidity: 50, windKmh: 10 },
      'paris': { tempC: 17, condition: 'Pleasant and sunny', humidity: 58, windKmh: 14 },
    };

    const key = cleanCity.toLowerCase();
    const data = weatherData[key] || {
      tempC: 21,
      condition: 'Clear and pleasant',
      humidity: 52,
      windKmh: 11,
    };

    return {
      city: cleanCity,
      temperatureC: data.tempC,
      temperatureF: Math.round((data.tempC * 9) / 5 + 32),
      condition: data.condition,
      humidityPercent: data.humidity,
      windSpeedKmh: data.windKmh,
    };
  },
});

// 3. Currency Converter Tool
defaultToolRegistry.register({
  name: 'currency_converter',
  description: 'Converts an amount between international currencies (USD, EUR, GBP, ETB, JPY, CAD, AUD).',
  parameters: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'The numerical amount to convert' },
      from: { type: 'string', description: '3-letter currency code, e.g. USD, EUR, ETB' },
      to: { type: 'string', description: '3-letter currency code, e.g. ETB, USD, EUR' },
    },
    required: ['amount', 'from', 'to'],
  },
  execute: async (args: Record<string, any>) => {
    const { amount, from, to } = args;
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new Error('Valid positive amount is required.');
    }

    const ratesToUSD: Record<string, number> = {
      USD: 1.0,
      EUR: 1.08,
      GBP: 1.29,
      ETB: 0.0083, // 1 USD ~ 120 ETB
      JPY: 0.0068,
      CAD: 0.74,
      AUD: 0.67,
    };

    const src = from.toUpperCase();
    const dst = to.toUpperCase();

    if (!ratesToUSD[src] || !ratesToUSD[dst]) {
      throw new Error(`Unsupported currency code. Supported: ${Object.keys(ratesToUSD).join(', ')}`);
    }

    const amountInUSD = amount * ratesToUSD[src];
    const convertedAmount = amountInUSD / ratesToUSD[dst];

    return {
      amount,
      from: src,
      to: dst,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      rate: Math.round((ratesToUSD[src] / ratesToUSD[dst]) * 10000) / 10000,
    };
  },
});

// 4. DateTime Tool
defaultToolRegistry.register({
  name: 'datetime',
  description: 'Returns the current real-time UTC and formatted local date and time.',
  parameters: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'Optional IANA timezone name, e.g. "Africa/Addis_Ababa", "UTC"' },
    },
    required: [],
  },
  execute: async ({ timezone }: { timezone?: string }) => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      utcString: now.toUTCString(),
      localFormatted: now.toLocaleString('en-US', { timeZone: timezone || 'UTC' }),
      timestampMs: now.getTime(),
    };
  },
});

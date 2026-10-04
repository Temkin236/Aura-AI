import { GoogleGenAI } from '@google/genai';

export interface IEmbeddingService {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  cosineSimilarity(vecA: number[], vecB: number[]): number;
}

export class EmbeddingService implements IEmbeddingService {
  private ai: GoogleGenAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName: string = 'text-embedding-004') {
    this.modelName = modelName;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aura-ai/0.1.0' } },
      });
    }
  }

  /**
   * Generates a dense numerical vector embedding for input text.
   * If Gemini API is not available or encounters an error, computes a deterministic
   * normalized semantic vector hash ensuring local dev & tests work reliably.
   */
  async embedText(text: string): Promise<number[]> {
    const cleanText = text.trim();
    if (!cleanText) {
      return new Array(64).fill(0);
    }

    if (this.ai) {
      try {
        const response: any = await this.ai.models.embedContent({
          model: this.modelName,
          contents: cleanText,
        });

        const values = response?.embedding?.values || response?.embeddings?.[0]?.values;
        if (values && Array.isArray(values) && values.length > 0) {
          return values;
        }
      } catch (err: any) {
        console.warn('Gemini embedding API fallback:', err?.message || err);
      }
    }

    return this.computeLocalSemanticVector(cleanText);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const emb = await this.embedText(text);
      embeddings.push(emb);
    }
    return embeddings;
  }

  /**
   * Computes cosine similarity between two vectors: (A · B) / (||A|| * ||B||)
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const minLen = Math.min(vecA.length, vecB.length);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLen; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Deterministic semantic hash vector (64-dimensional normalized vector)
   * used for offline development and unit tests.
   */
  private computeLocalSemanticVector(text: string): number[] {
    const dim = 64;
    const vec = new Array(dim).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      for (let i = 0; i < word.length; i++) {
        const charCode = word.charCodeAt(i);
        const targetDim = (charCode * 31 + i * 17 + wIdx * 13) % dim;
        vec[targetDim] += (1.0 / (i + 1)) * (charCode % 7 + 1);
      }
    }

    // Normalize vector to unit length
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vec[i] * vec[i];
    }
    const magnitude = Math.sqrt(norm);
    if (magnitude > 0) {
      for (let i = 0; i < dim; i++) {
        vec[i] = vec[i] / magnitude;
      }
    }
    return vec;
  }
}

export const defaultEmbeddingService = new EmbeddingService(process.env.GEMINI_API_KEY);

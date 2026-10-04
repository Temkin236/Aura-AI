import { createDocument, insertDocumentChunks, findSimilarChunks, RetrievedChunk } from '../db/documents';
import { defaultEmbeddingService, IEmbeddingService } from './embeddings';

export interface IngestDocumentInput {
  title: string;
  filename: string;
  mimeType: string;
  content: string;
}

export interface Chunk {
  chunkIndex: number;
  content: string;
  metadata: {
    title: string;
    filename: string;
    charLength: number;
  };
}

/**
 * Splits document text into clean, bounded semantic chunks with overlap.
 */
export function chunkText(
  text: string,
  title: string,
  filename: string,
  maxChunkSize: number = 600,
  overlap: number = 100
): Chunk[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const chunks: Chunk[] = [];
  let startIndex = 0;
  let chunkIdx = 0;

  while (startIndex < normalized.length) {
    let endIndex = startIndex + maxChunkSize;
    if (endIndex >= normalized.length) {
      endIndex = normalized.length;
    } else {
      // Look for natural sentence or newline break near endIndex
      const lastNewline = normalized.lastIndexOf('\n', endIndex);
      const lastPeriod = normalized.lastIndexOf('. ', endIndex);
      const breakPoint = Math.max(lastNewline, lastPeriod);

      if (breakPoint > startIndex + 200) {
        endIndex = breakPoint + (lastPeriod === breakPoint ? 1 : 0);
      }
    }

    const chunkContent = normalized.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        chunkIndex: chunkIdx++,
        content: chunkContent,
        metadata: {
          title,
          filename,
          charLength: chunkContent.length,
        },
      });
    }

    if (endIndex >= normalized.length) break;
    startIndex = Math.max(startIndex + 1, endIndex - overlap);
  }

  return chunks;
}

/**
 * Ingestion pipeline: saves document, chunks it, generates embeddings, and saves to database.
 */
export async function ingestDocument(
  userId: string,
  input: IngestDocumentInput,
  embeddingService: IEmbeddingService = defaultEmbeddingService
) {
  const sizeBytes = Buffer.byteLength(input.content, 'utf8');
  const doc = await createDocument(userId, {
    title: input.title || input.filename,
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes,
  });

  const rawChunks = chunkText(input.content, doc.title, doc.filename);
  const chunkPayloads: Array<{
    chunkIndex: number;
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
  }> = [];

  for (const c of rawChunks) {
    const embedding = await embeddingService.embedText(c.content);
    chunkPayloads.push({
      chunkIndex: c.chunkIndex,
      content: c.content,
      embedding,
      metadata: c.metadata,
    });
  }

  await insertDocumentChunks(userId, doc.id, chunkPayloads);

  return {
    documentId: doc.id,
    title: doc.title,
    chunksCount: chunkPayloads.length,
  };
}

/**
 * Retrieves relevant context chunks and augments the user prompt.
 */
export async function retrieveRagContext(
  userId: string,
  query: string,
  topK: number = 3,
  embeddingService: IEmbeddingService = defaultEmbeddingService
): Promise<{ contextText: string; sources: RetrievedChunk[] }> {
  const queryEmbedding = await embeddingService.embedText(query);
  const chunks = await findSimilarChunks(userId, queryEmbedding, topK, 0.2, embeddingService);

  if (chunks.length === 0) {
    return { contextText: '', sources: [] };
  }

  const contextText = chunks
    .map(
      (c, idx) =>
        `[Source ${idx + 1}: "${c.documentTitle}" (Chunk ${c.chunkIndex + 1})]\n${c.content}`
    )
    .join('\n\n');

  return { contextText, sources: chunks };
}

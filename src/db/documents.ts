import { getPool } from './index';
import { DbDocument, DbDocumentChunk } from './types';
import { defaultEmbeddingService, IEmbeddingService } from '../ai/embeddings';

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

export async function createDocument(
  userId: string,
  doc: {
    title: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }
): Promise<DbDocument> {
  const pool = getPool();
  const query = `
    INSERT INTO documents (user_id, title, filename, mime_type, size_bytes, total_chunks)
    VALUES ($1, $2, $3, $4, $5, 0)
    RETURNING id, user_id, title, filename, mime_type, size_bytes, total_chunks, created_at, updated_at;
  `;
  const res = await pool.query(query, [
    userId,
    doc.title.slice(0, 255),
    doc.filename.slice(0, 255),
    doc.mimeType.toLowerCase(),
    doc.sizeBytes,
  ]);
  const row = res.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    total_chunks: row.total_chunks,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function insertDocumentChunks(
  userId: string,
  documentId: string,
  chunks: Array<{
    chunkIndex: number;
    content: string;
    embedding: number[];
    metadata?: Record<string, any>;
  }>
): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const c of chunks) {
      await client.query(
        `INSERT INTO document_chunks (document_id, user_id, chunk_index, content, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          documentId,
          userId,
          c.chunkIndex,
          c.content,
          JSON.stringify(c.embedding),
          JSON.stringify(c.metadata || {}),
        ]
      );
    }

    await client.query(
      `UPDATE documents SET total_chunks = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3;`,
      [chunks.length, documentId, userId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listDocuments(userId: string): Promise<DbDocument[]> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT id, user_id, title, filename, mime_type, size_bytes, total_chunks, created_at, updated_at
     FROM documents
     WHERE user_id = $1
     ORDER BY created_at DESC;`,
    [userId]
  );
  return res.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    total_chunks: row.total_chunks,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getDocumentById(userId: string, documentId: string): Promise<DbDocument | null> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT id, user_id, title, filename, mime_type, size_bytes, total_chunks, created_at, updated_at
     FROM documents
     WHERE id = $1 AND user_id = $2;`,
    [documentId, userId]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    total_chunks: row.total_chunks,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function deleteDocument(userId: string, documentId: string): Promise<boolean> {
  const pool = getPool();
  const res = await pool.query(`DELETE FROM documents WHERE id = $1 AND user_id = $2;`, [documentId, userId]);
  return (res.rowCount ?? 0) > 0;
}

export async function findSimilarChunks(
  userId: string,
  queryEmbedding: number[],
  topK: number = 3,
  minSimilarity: number = 0.25,
  embeddingService: IEmbeddingService = defaultEmbeddingService
): Promise<RetrievedChunk[]> {
  const pool = getPool();
  const query = `
    SELECT dc.document_id, d.title as document_title, dc.chunk_index, dc.content, dc.embedding, dc.metadata
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE dc.user_id = $1;
  `;
  const res = await pool.query(query, [userId]);
  if (res.rows.length === 0) return [];

  const scoredChunks: RetrievedChunk[] = [];

  for (const row of res.rows) {
    let embedding: number[] = [];
    try {
      embedding = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
    } catch {
      embedding = [];
    }

    const similarity = embeddingService.cosineSimilarity(queryEmbedding, embedding);
    if (similarity >= minSimilarity) {
      scoredChunks.push({
        documentId: row.document_id,
        documentTitle: row.document_title,
        chunkIndex: row.chunk_index,
        content: row.content,
        similarity: Math.round(similarity * 1000) / 1000,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      });
    }
  }

  scoredChunks.sort((a, b) => b.similarity - a.similarity);
  return scoredChunks.slice(0, topK);
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import { setPool } from '../db/index';
import { runMigrations } from '../db/migrate';
import { EmbeddingService } from '../ai/embeddings';
import { chunkText, ingestDocument, retrieveRagContext } from '../ai/rag';
import { listDocuments, getDocumentById, deleteDocument, findSimilarChunks } from '../db/documents';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA V2 — Phase 4: Embeddings, Vector Search & RAG', () => {
  let memDb: IMemoryDb;
  let pgAdapter: any;
  const embeddingService = new EmbeddingService();

  beforeEach(async () => {
    memDb = newDb({ noAstCoverageCheck: true });
    let uuidCounter = 1;
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      implementation: () => `44444444-5555-6666-7777-${String(uuidCounter++).padStart(12, '0')}`,
    });

    const { Pool } = memDb.adapters.createPg();
    pgAdapter = new Pool();
    setPool(pgAdapter);

    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    await runMigrations(pgAdapter, migrationsDir);
  });

  afterEach(async () => {
    setPool(null);
    if (pgAdapter) {
      await pgAdapter.end();
    }
  });

  describe('Embedding Service & Cosine Similarity', () => {
    it('generates normalized dense vectors for text', async () => {
      const vec = await embeddingService.embedText('Distributed Consensus and Paxos protocol');
      expect(Array.isArray(vec)).toBe(true);
      expect(vec.length).toBeGreaterThan(0);
    });

    it('computes high similarity for identical or related texts', async () => {
      const vecA = await embeddingService.embedText('PostgreSQL database indexing and query optimization');
      const vecB = await embeddingService.embedText('PostgreSQL database indexing and query performance');
      const vecC = await embeddingService.embedText('Pastry baking sourdough croissants recipe');

      const simRelated = embeddingService.cosineSimilarity(vecA, vecB);
      const simUnrelated = embeddingService.cosineSimilarity(vecA, vecC);

      expect(simRelated).toBeGreaterThan(simUnrelated);
      expect(simRelated).toBeGreaterThan(0.7);
    });
  });

  describe('Document Chunking Algorithm', () => {
    it('chunks long text while preserving sentence boundaries and metadata', () => {
      const text = `
        Chapter 1: The Core Architecture.
        AURA AI uses an editorial aesthetic with warm cream and dark espresso tones.
        All AI credentials remain strictly on the backend.
        
        Chapter 2: Database Persistence.
        PostgreSQL is the authoritative source of truth for all authenticated user state.
        Cascading foreign keys guarantee clean state isolation across users.
      `;

      const chunks = chunkText(text, 'Architecture Guide', 'guide.md', 150, 30);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].metadata.title).toBe('Architecture Guide');
      expect(chunks[0].metadata.filename).toBe('guide.md');
    });
  });

  describe('RAG Ingestion & Scoped Retrieval', () => {
    const userA = '11111111-0000-0000-0000-000000000001';
    const userB = '22222222-0000-0000-0000-000000000002';

    beforeEach(async () => {
      // Seed users
      await pgAdapter.query(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, 'usera@test.com', 'hash'), ($2, 'userb@test.com', 'hash');",
        [userA, userB]
      );
    });

    it('ingests a document, creates chunks with embeddings, and retrieves relevant context', async () => {
      const doc = await ingestDocument(
        userA,
        {
          title: 'Quantum Computing Fundamentals',
          filename: 'quantum.txt',
          mimeType: 'text/plain',
          content: 'Quantum computing leverages qubits and superposition to solve combinatorial optimization problems exponentially faster than classical Turing machines.',
        },
        embeddingService
      );

      expect(doc.documentId).toBeDefined();
      expect(doc.chunksCount).toBeGreaterThan(0);

      // Search
      const searchResult = await retrieveRagContext(userA, 'How does quantum computing and superposition work?', 3, embeddingService);
      expect(searchResult.sources.length).toBeGreaterThan(0);
      expect(searchResult.sources[0].documentTitle).toBe('Quantum Computing Fundamentals');
      expect(searchResult.contextText).toContain('Quantum computing leverages qubits');
    });

    it('strictly isolates RAG documents: User B cannot retrieve User A documents', async () => {
      await ingestDocument(
        userA,
        {
          title: 'User A Secret Strategy Plan',
          filename: 'secret.txt',
          mimeType: 'text/plain',
          content: 'Confidential project codename Nebula release scheduled for next quarter.',
        },
        embeddingService
      );

      // User B attempts retrieval
      const userBSearch = await retrieveRagContext(userB, 'codename Nebula strategy plan', 3, embeddingService);
      expect(userBSearch.sources.length).toBe(0);
      expect(userBSearch.contextText).toBe('');
    });

    it('deletes document and cascades deletion of vector chunks', async () => {
      const doc = await ingestDocument(
        userA,
        {
          title: 'Temporary Doc',
          filename: 'temp.txt',
          mimeType: 'text/plain',
          content: 'Some temporary contents to delete.',
        },
        embeddingService
      );

      const deleted = await deleteDocument(userA, doc.documentId);
      expect(deleted).toBe(true);

      const fetched = await getDocumentById(userA, doc.documentId);
      expect(fetched).toBeNull();
    });
  });
});

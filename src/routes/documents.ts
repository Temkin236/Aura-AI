import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { ingestDocument, retrieveRagContext } from '../ai/rag';
import { listDocuments, getDocumentById, deleteDocument } from '../db/documents';
import { isValidUuid } from '../auth/service';

const router = Router();

// Apply requireAuth to all document and RAG endpoints
router.use(requireAuth);

/**
 * POST /api/documents/ingest
 * Ingests a new document: extracts text, chunks, computes embeddings, and stores in PostgreSQL.
 */
router.post('/ingest', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, filename, mimeType, content } = req.body;

    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ error: 'A valid filename is required.' });
      return;
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'Document content is required.' });
      return;
    }

    if (content.length > 500000) {
      res.status(400).json({ error: 'Document content exceeds 500KB limit.' });
      return;
    }

    const result = await ingestDocument(req.user!.id, {
      title: title || filename,
      filename,
      mimeType: mimeType || 'text/plain',
      content,
    });

    res.status(201).json({
      ok: true,
      document: result,
    });
  } catch (err: any) {
    console.error('Error in /api/documents/ingest:', err?.message || err);
    res.status(500).json({ error: 'Failed to ingest document.' });
  }
});

/**
 * GET /api/documents
 * Lists all ingested documents for the authenticated user.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const docs = await listDocuments(req.user!.id);
    res.json({ documents: docs });
  } catch (err: any) {
    console.error('Error in GET /api/documents:', err?.message || err);
    res.status(500).json({ error: 'Failed to list documents.' });
  }
});

/**
 * GET /api/documents/:id
 * Retrieves a single document by ID with verification of user ownership.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid document ID format.' });
      return;
    }

    const doc = await getDocumentById(req.user!.id, id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found or access denied.' });
      return;
    }

    res.json({ document: doc });
  } catch (err: any) {
    console.error('Error in GET /api/documents/:id:', err?.message || err);
    res.status(500).json({ error: 'Failed to get document.' });
  }
});

/**
 * DELETE /api/documents/:id
 * Deletes a document and cascades deletion of its vector chunks.
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid document ID format.' });
      return;
    }

    const deleted = await deleteDocument(req.user!.id, id);
    if (!deleted) {
      res.status(404).json({ error: 'Document not found or access denied.' });
      return;
    }

    res.json({ ok: true, message: 'Document and associated vector chunks deleted.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/documents/:id:', err?.message || err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

/**
 * POST /api/documents/search
 * Performs semantic similarity search against the authenticated user's vector chunks.
 */
router.post('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, topK } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query string is required.' });
      return;
    }

    const { contextText, sources } = await retrieveRagContext(req.user!.id, query, topK || 3);
    res.json({ contextText, sources });
  } catch (err: any) {
    console.error('Error in POST /api/documents/search:', err?.message || err);
    res.status(500).json({ error: 'Failed to perform semantic search.' });
  }
});

export default router;

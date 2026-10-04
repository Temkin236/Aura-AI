import { Router, Request, Response } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth';
import {
  createAttachment,
  getAttachmentById,
  listAttachmentsForConversation,
  validateAttachment,
} from '../db/attachments';
import { isValidUuid } from '../auth/service';

const router = Router();

/**
 * POST /api/attachments/upload
 * Validates and records an uploaded attachment (image, pdf, document).
 */
router.post('/upload', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, mimeType, sizeBytes, dataUrl, conversationId } = req.body;

    const validation = validateAttachment(filename, mimeType, sizeBytes, dataUrl);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    if (conversationId && !isValidUuid(conversationId)) {
      res.status(400).json({ error: 'Invalid conversationId UUID format.' });
      return;
    }

    const userId = req.user ? req.user.id : null;
    const attachment = await createAttachment(userId, {
      conversationId: conversationId || null,
      filename,
      mimeType,
      sizeBytes,
      dataUrl: dataUrl || null,
    });

    res.status(201).json({
      ok: true,
      attachment: {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mime_type,
        sizeBytes: attachment.size_bytes,
        createdAt: attachment.created_at,
        dataUrl: attachment.data_url,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/attachments/upload:', err?.message || err);
    res.status(500).json({ error: 'Failed to upload attachment.' });
  }
});

/**
 * GET /api/attachments/:id
 * Retrieves an attachment by ID, enforcing user ownership if authenticated.
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid attachment ID format.' });
      return;
    }

    const userId = req.user ? req.user.id : null;
    const attachment = await getAttachmentById(id, userId);

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found or access denied.' });
      return;
    }

    res.json({
      attachment: {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mime_type,
        sizeBytes: attachment.size_bytes,
        dataUrl: attachment.data_url,
        createdAt: attachment.created_at,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/attachments/:id:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve attachment.' });
  }
});

/**
 * GET /api/attachments/conversation/:conversationId
 * Lists all attachments for a specific conversation.
 */
router.get('/conversation/:conversationId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    if (!isValidUuid(conversationId)) {
      res.status(400).json({ error: 'Invalid conversationId UUID format.' });
      return;
    }

    const attachments = await listAttachmentsForConversation(req.user!.id, conversationId);
    res.json({ attachments });
  } catch (err: any) {
    console.error('Error in GET /api/attachments/conversation/:id:', err?.message || err);
    res.status(500).json({ error: 'Failed to list conversation attachments.' });
  }
});

export default router;

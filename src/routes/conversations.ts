import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { isValidUuid } from '../auth/service';
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  listMessages,
  createMessage,
  VALID_ROLES,
} from '../db/conversations';

const router = express.Router();

// Apply requireAuth to all conversation routes
router.use(requireAuth);

/**
 * GET /api/conversations
 * List all conversations belonging to the authenticated user.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const conversations = await listConversations(userId);
    res.json({ conversations });
  } catch (err: any) {
    console.error('List conversations error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation owned by the authenticated user.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id, title, mode, pinned, archived } = req.body || {};

    if (id !== undefined && !isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid conversation ID format' });
      return;
    }

    const conversation = await createConversation(userId, {
      id,
      title,
      mode,
      pinned,
      archived,
    });

    res.status(201).json({ conversation });
  } catch (err: any) {
    console.error('Create conversation error:', err.message);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * GET /api/conversations/:id
 * Retrieve a single conversation. Returns 404 if not found or owned by another user.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid conversation ID format' });
      return;
    }

    const userId = req.user!.id;
    const conversation = await getConversation(userId, id);

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json({ conversation });
  } catch (err: any) {
    console.error('Get conversation error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve conversation' });
  }
});

/**
 * PATCH /api/conversations/:id
 * Update a conversation (title, mode, pinned, archived).
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid conversation ID format' });
      return;
    }

    const userId = req.user!.id;
    const { title, mode, pinned, archived } = req.body || {};

    const updated = await updateConversation(userId, id, {
      title,
      mode,
      pinned,
      archived,
    });

    if (!updated) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json({ conversation: updated });
  } catch (err: any) {
    console.error('Update conversation error:', err.message);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation and its messages.
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid conversation ID format' });
      return;
    }

    const userId = req.user!.id;
    const deleted = await deleteConversation(userId, id);

    if (!deleted) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json({ ok: true, id });
  } catch (err: any) {
    console.error('Delete conversation error:', err.message);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * GET /api/conversations/:id/messages
 * List all messages in a conversation owned by the authenticated user.
 */
router.get('/:id/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid conversation ID format' });
      return;
    }

    const userId = req.user!.id;
    const messages = await listMessages(userId, id);

    if (!messages) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json({ messages });
  } catch (err: any) {
    console.error('List messages error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Append a message to a conversation owned by the authenticated user.
 */
router.post('/:id/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid conversation ID format' });
      return;
    }

    const userId = req.user!.id;
    const { role, content, mode, model, messageId } = req.body || {};

    if (!role || !VALID_ROLES.includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
      return;
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'Content cannot be empty' });
      return;
    }

    if (messageId !== undefined && !isValidUuid(messageId)) {
      res.status(400).json({ error: 'Invalid message ID format' });
      return;
    }

    const message = await createMessage(userId, id, {
      id: messageId,
      role,
      content,
      mode,
      model,
    });

    if (!message) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.status(201).json({ message });
  } catch (err: any) {
    console.error('Create message error:', err.message);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

export default router;

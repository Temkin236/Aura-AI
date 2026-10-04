import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getConversation, listMessages } from '../db/conversations';
import { isValidUuid } from '../auth/service';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/export/:conversationId/markdown
 * Exports a conversation as a downloadable Markdown (.md) document.
 */
router.get('/:conversationId/markdown', async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    if (!isValidUuid(conversationId)) {
      res.status(400).json({ error: 'Invalid conversationId UUID format.' });
      return;
    }

    const conv = await getConversation(req.user!.id, conversationId);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found or access denied.' });
      return;
    }

    const messages = await listMessages(req.user!.id, conversationId);
    if (!messages) {
      res.status(404).json({ error: 'Failed to retrieve messages.' });
      return;
    }

    let md = `# ${conv.title}\n\n`;
    md += `> **Mode**: ${conv.mode} | **Exported**: ${new Date().toUTCString()}\n\n---\n\n`;

    for (const msg of messages) {
      const sender = msg.role === 'user' ? '### 👤 You' : '### ✨ AURA AI';
      md += `${sender}\n*${new Date(msg.createdAt).toLocaleTimeString()}*\n\n${msg.content}\n\n---\n\n`;
    }

    const sanitizedFilename = conv.title.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}.md"`);
    res.send(md);
  } catch (err: any) {
    console.error('Error exporting markdown:', err?.message || err);
    res.status(500).json({ error: 'Failed to export conversation.' });
  }
});

/**
 * GET /api/export/:conversationId/json
 * Exports a conversation as structured JSON.
 */
router.get('/:conversationId/json', async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    if (!isValidUuid(conversationId)) {
      res.status(400).json({ error: 'Invalid conversationId UUID format.' });
      return;
    }

    const conv = await getConversation(req.user!.id, conversationId);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found or access denied.' });
      return;
    }

    const messages = await listMessages(req.user!.id, conversationId);
    if (!messages) {
      res.status(404).json({ error: 'Failed to retrieve messages.' });
      return;
    }

    const exportData = {
      title: conv.title,
      mode: conv.mode,
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        mode: m.mode,
        model: m.model,
        timestamp: m.createdAt,
      })),
    };

    const sanitizedFilename = conv.title.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}.json"`);
    res.json(exportData);
  } catch (err: any) {
    console.error('Error exporting json:', err?.message || err);
    res.status(500).json({ error: 'Failed to export conversation.' });
  }
});

/**
 * GET /api/export/:conversationId/pdf
 * Exports a print-ready formatted HTML document for PDF conversion.
 */
router.get('/:conversationId/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    if (!isValidUuid(conversationId)) {
      res.status(400).json({ error: 'Invalid conversationId UUID format.' });
      return;
    }

    const conv = await getConversation(req.user!.id, conversationId);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found or access denied.' });
      return;
    }

    const messages = await listMessages(req.user!.id, conversationId);
    if (!messages) {
      res.status(404).json({ error: 'Failed to retrieve messages.' });
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${conv.title} - AURA AI Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #2B1D17; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { font-family: "Cormorant Garamond", Georgia, serif; color: #4A3026; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #8A7A70; margin-bottom: 24px; border-bottom: 1px solid #EDE1D5; padding-bottom: 12px; }
    .message { margin-bottom: 24px; padding: 16px; border-radius: 8px; }
    .user { background-color: #EDE1D5; }
    .assistant { background-color: #FCFAF7; border: 1px solid #DCC9B8; }
    .sender { font-weight: bold; font-size: 13px; margin-bottom: 6px; color: #C7A46A; }
    .content { white-space: pre-wrap; font-size: 14px; }
    @media print { body { max-width: 100%; margin: 0; padding: 10px; } }
  </style>
</head>
<body>
  <h1>${conv.title}</h1>
  <div class="meta">Mode: <strong>${conv.mode}</strong> | Exported: ${new Date().toLocaleDateString()}</div>
  ${messages
    .map(
      (m) => `
    <div class="message ${m.role}">
      <div class="sender">${m.role === 'user' ? 'YOU' : 'AURA AI'} &bull; ${new Date(m.createdAt).toLocaleTimeString()}</div>
      <div class="content">${m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
  `
    )
    .join('')}
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    console.error('Error exporting printable document:', err?.message || err);
    res.status(500).json({ error: 'Failed to export document.' });
  }
});

export default router;

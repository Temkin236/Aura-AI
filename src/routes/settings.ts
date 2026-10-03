import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getSettings, updateSettings, SettingsUpdateInput } from '../db/settings';
import { ALLOWED_MODELS } from '../../server';
import { AIModeId } from '../types';

const router = Router();

// Apply requireAuth middleware to all settings routes
router.use(requireAuth);

const VALID_THEMES = ['light', 'dark', 'system'] as const;
const VALID_MODES: AIModeId[] = ['developer', 'creative', 'tutor', 'friendly', 'professional'];

/**
 * GET /api/settings
 * Retrieves the authenticated user's settings.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const settings = await getSettings(userId);
    res.status(200).json({ settings });
  } catch (err: any) {
    console.error('Failed to get settings:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

/**
 * PATCH /api/settings
 * Partially updates the authenticated user's settings with strict server-side validation.
 */
router.patch('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Request body must be a valid JSON object.' });
      return;
    }

    const updates: SettingsUpdateInput = {};

    // 1. Validate theme
    if (body.theme !== undefined) {
      if (!VALID_THEMES.includes(body.theme)) {
        res.status(400).json({
          error: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}`,
        });
        return;
      }
      updates.theme = body.theme;
    }

    // 2. Validate default mode / persona
    const rawMode = body.defaultMode !== undefined ? body.defaultMode : body.default_mode;
    if (rawMode !== undefined) {
      if (!VALID_MODES.includes(rawMode)) {
        res.status(400).json({
          error: `Invalid default mode. Must be one of: ${VALID_MODES.join(', ')}`,
        });
        return;
      }
      updates.defaultMode = rawMode;
    }

    // 3. Validate AI model
    if (body.model !== undefined) {
      if (typeof body.model !== 'string' || !(ALLOWED_MODELS as readonly string[]).includes(body.model)) {
        res.status(400).json({
          error: `Invalid model. Must be one of: ${ALLOWED_MODELS.join(', ')}`,
        });
        return;
      }
      updates.model = body.model;
    }

    // 4. Validate temperature
    if (body.temperature !== undefined) {
      if (typeof body.temperature !== 'number' || isNaN(body.temperature) || !isFinite(body.temperature)) {
        res.status(400).json({ error: 'Temperature must be a valid finite number.' });
        return;
      }
      if (body.temperature < 0.0 || body.temperature > 2.0) {
        res.status(400).json({ error: 'Temperature must be between 0.0 and 2.0.' });
        return;
      }
      updates.temperature = body.temperature;
    }

    // 5. Validate boolean flags
    const rawSaveHistory = body.saveHistory !== undefined ? body.saveHistory : body.save_history;
    if (rawSaveHistory !== undefined) {
      if (typeof rawSaveHistory !== 'boolean') {
        res.status(400).json({ error: 'saveHistory must be a boolean.' });
        return;
      }
      updates.saveHistory = rawSaveHistory;
    }

    const rawAutoTitle = body.autoTitle !== undefined ? body.autoTitle : body.auto_title;
    if (rawAutoTitle !== undefined) {
      if (typeof rawAutoTitle !== 'boolean') {
        res.status(400).json({ error: 'autoTitle must be a boolean.' });
        return;
      }
      updates.autoTitle = rawAutoTitle;
    }

    const rawStreamResponses = body.streamResponses !== undefined ? body.streamResponses : body.stream_responses;
    if (rawStreamResponses !== undefined) {
      if (typeof rawStreamResponses !== 'boolean') {
        res.status(400).json({ error: 'streamResponses must be a boolean.' });
        return;
      }
      updates.streamResponses = rawStreamResponses;
    }

    const rawSoundEffects = body.soundEffects !== undefined ? body.soundEffects : body.sound_effects;
    if (rawSoundEffects !== undefined) {
      if (typeof rawSoundEffects !== 'boolean') {
        res.status(400).json({ error: 'soundEffects must be a boolean.' });
        return;
      }
      updates.soundEffects = rawSoundEffects;
    }

    // 6. Validate preferences object if provided
    if (body.preferences !== undefined) {
      if (typeof body.preferences !== 'object' || body.preferences === null || Array.isArray(body.preferences)) {
        res.status(400).json({ error: 'preferences must be a JSON object.' });
        return;
      }
      updates.preferences = body.preferences;
    }

    const updatedSettings = await updateSettings(userId, updates);
    res.status(200).json({ settings: updatedSettings });
  } catch (err: any) {
    console.error('Failed to update settings:', err?.message || err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

export default router;

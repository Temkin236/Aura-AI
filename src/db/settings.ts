import pg from 'pg';
import { getPool } from './index';
import { DbSettings } from './types';
import { UserSettings, AIModeId } from '../types';

export interface SettingsUpdateInput {
  theme?: 'light' | 'dark' | 'system';
  defaultMode?: AIModeId;
  default_mode?: AIModeId;
  model?: string;
  temperature?: number;
  saveHistory?: boolean;
  save_history?: boolean;
  autoTitle?: boolean;
  auto_title?: boolean;
  streamResponses?: boolean;
  stream_responses?: boolean;
  soundEffects?: boolean;
  sound_effects?: boolean;
  preferences?: Record<string, any>;
}

/**
 * Transforms a raw database settings row into a safe, client-facing UserSettings object.
 */
export function toUserSettings(row: DbSettings | any): UserSettings {
  return {
    theme: (row.theme as 'light' | 'dark' | 'system') || 'light',
    defaultMode: (row.default_mode as AIModeId) || 'developer',
    model: row.model || 'gemini-2.5-flash',
    temperature: typeof row.temperature === 'number' ? row.temperature : parseFloat(row.temperature) || 0.7,
    saveHistory: Boolean(row.save_history),
    autoTitle: Boolean(row.auto_title),
    streamResponses: Boolean(row.stream_responses),
    soundEffects: Boolean(row.sound_effects),
  };
}

/**
 * Retrieves the settings for a user.
 * If no settings row exists yet (e.g., legacy or edge-case accounts), creates a default row safely.
 */
export async function getSettings(
  userId: string,
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<UserSettings> {
  const executor = clientOrPool || getPool();

  const queryText = `
    SELECT id, user_id, theme, default_mode, model, temperature,
           save_history, auto_title, stream_responses, sound_effects,
           preferences, created_at, updated_at
    FROM settings
    WHERE user_id = $1;
  `;

  const result = await executor.query(queryText, [userId]);

  if (result.rows.length > 0) {
    return toUserSettings(result.rows[0]);
  }

  // If missing, safely insert default settings row
  const insertText = `
    INSERT INTO settings (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING id, user_id, theme, default_mode, model, temperature,
              save_history, auto_title, stream_responses, sound_effects,
              preferences, created_at, updated_at;
  `;

  const insertResult = await executor.query(insertText, [userId]);
  return toUserSettings(insertResult.rows[0]);
}

/**
 * Updates a user's settings partially using parameterized SQL.
 * Never overrides fields that were not provided in the update payload.
 */
export async function updateSettings(
  userId: string,
  updates: SettingsUpdateInput,
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<UserSettings> {
  const executor = clientOrPool || getPool();

  const setClauses: string[] = [];
  const values: any[] = [userId];
  let paramIndex = 2;

  // Map theme
  if (updates.theme !== undefined) {
    setClauses.push(`theme = $${paramIndex++}`);
    values.push(updates.theme);
  }

  // Map default_mode
  const modeVal = updates.defaultMode !== undefined ? updates.defaultMode : updates.default_mode;
  if (modeVal !== undefined) {
    setClauses.push(`default_mode = $${paramIndex++}`);
    values.push(modeVal);
  }

  // Map model
  if (updates.model !== undefined) {
    setClauses.push(`model = $${paramIndex++}`);
    values.push(updates.model);
  }

  // Map temperature
  if (updates.temperature !== undefined) {
    setClauses.push(`temperature = $${paramIndex++}`);
    values.push(updates.temperature);
  }

  // Map save_history
  const saveHistoryVal = updates.saveHistory !== undefined ? updates.saveHistory : updates.save_history;
  if (saveHistoryVal !== undefined) {
    setClauses.push(`save_history = $${paramIndex++}`);
    values.push(Boolean(saveHistoryVal));
  }

  // Map auto_title
  const autoTitleVal = updates.autoTitle !== undefined ? updates.autoTitle : updates.auto_title;
  if (autoTitleVal !== undefined) {
    setClauses.push(`auto_title = $${paramIndex++}`);
    values.push(Boolean(autoTitleVal));
  }

  // Map stream_responses
  const streamVal = updates.streamResponses !== undefined ? updates.streamResponses : updates.stream_responses;
  if (streamVal !== undefined) {
    setClauses.push(`stream_responses = $${paramIndex++}`);
    values.push(Boolean(streamVal));
  }

  // Map sound_effects
  const soundVal = updates.soundEffects !== undefined ? updates.soundEffects : updates.sound_effects;
  if (soundVal !== undefined) {
    setClauses.push(`sound_effects = $${paramIndex++}`);
    values.push(Boolean(soundVal));
  }

  // Map preferences JSONB
  if (updates.preferences !== undefined) {
    setClauses.push(`preferences = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(updates.preferences));
  }

  // If nothing to update, return current settings
  if (setClauses.length === 0) {
    return getSettings(userId, executor);
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

  const updateText = `
    UPDATE settings
    SET ${setClauses.join(', ')}
    WHERE user_id = $1
    RETURNING id, user_id, theme, default_mode, model, temperature,
              save_history, auto_title, stream_responses, sound_effects,
              preferences, created_at, updated_at;
  `;

  let result = await executor.query(updateText, values);

  if (result.rows.length === 0) {
    // If no row existed to update, ensure default row is inserted first, then update
    await getSettings(userId, executor);
    result = await executor.query(updateText, values);
  }

  return toUserSettings(result.rows[0]);
}

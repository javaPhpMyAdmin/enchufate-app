/**
 * AsyncStorage persistence for the publish draft.
 *
 * The draft is a single JSON blob under `enchufate.publish.draft`. We
 * validate on read so a payload written by an older schema doesn't
 * silently corrupt the wizard — anything that fails validation is treated
 * as "no draft" and the key is cleared.
 */
import { z } from 'zod';

import { storage } from '@/lib/storage';
import type { Charger } from '@/data/types';

import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
} from './schemas';
import type { ChargerDraft, WeeklySchedule } from './types';
import { buildDefaultSchedule } from './types';

const STORAGE_KEY = 'enchufate.publish.draft';

const dayScheduleSchema = z.object({
  day: z.number().int().min(0).max(6),
  enabled: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
});

const persistedSchema = z
  .object({
    step1: step1Schema.optional(),
    step2: step2Schema.optional(),
    step3: step3Schema.optional(),
    step4: step4Schema.optional(),
    step5: step5Schema.optional(),
    step6: z
      .object({ schedule: z.array(dayScheduleSchema).length(7) })
      .optional(),
    step7: step7Schema.optional(),
    editingId: z.string().optional(),
  })
  .strict();

/** Save the current draft. Swallows storage errors. */
export async function saveDraft(draft: ChargerDraft): Promise<void> {
  await storage.setJSON(STORAGE_KEY, draft);
}

/**
 * Load the persisted draft. Returns `null` when:
 *   - the key is missing (first run)
 *   - the payload fails schema validation (stale or tampered)
 * In the failure case we also clear the key so subsequent loads are clean.
 */
export async function loadDraft(): Promise<ChargerDraft | null> {
  const raw = await storage.getJSON<unknown>(STORAGE_KEY);
  if (raw == null) return null;
  const result = persistedSchema.safeParse(raw);
  if (!result.success) {
    console.warn(
      '[publish] discarding stale draft from AsyncStorage',
      result.error.message,
    );
    await clearDraft();
    return null;
  }
  return result.data as ChargerDraft;
}

/** Clear the persisted draft. Swallows storage errors. */
export async function clearDraft(): Promise<void> {
  await storage.remove(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Converters — between a stored `Charger` and an in-progress `ChargerDraft`.
// Used by the "Editar" entry point: prefill the draft with the charger's
// data so the user only edits what they want to change.
// ---------------------------------------------------------------------------

export function chargerToDraft(charger: Charger): ChargerDraft {
  return {
    step1: { title: charger.title, description: charger.description },
    step2: { location: charger.location, address: charger.address },
    step3: { connectorType: charger.type, powerKw: charger.powerKw },
    step4: { photoUrls: charger.photos ?? [] },
    step5: { pricePerHour: charger.pricePerHour, minRentalMinutes: 60 },
    step6: { schedule: scheduleFromCharger(charger) },
    step7: { rules: '' },
    editingId: charger.id,
  };
}

/**
 * Build a default `WeeklySchedule` shape. We don't have weekly availability
 * persisted on the seed chargers, so we start with all days enabled
 * 09:00–18:00 (the default for new chargers) and the host can edit from
 * there.
 */
function scheduleFromCharger(_charger: Charger): WeeklySchedule {
  return buildDefaultSchedule();
}

/**
 * Zod schemas for the messages feature.
 *
 * `messageDraftSchema` validates a draft message at the chat input.
 * Keep the error messages short and in Spanish — they appear inline.
 */
import { z } from 'zod';

const MAX_BODY_LENGTH = 1000;

export const messageDraftSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Escribí un mensaje')
    .max(MAX_BODY_LENGTH, `Máximo ${MAX_BODY_LENGTH} caracteres`),
});

export type MessageDraftInput = z.infer<typeof messageDraftSchema>;

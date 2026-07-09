/**
 * Zod schemas for the on-disk message store shape.
 *
 * Mirrors `Conversation` and `Message` from `@/data/types` and is used by
 * the store on hydration so a corrupted AsyncStorage payload (older
 * schema, manual edit) cannot crash the app. The store drops invalid
 * records and falls back to the curated seed.
 */
import { z } from 'zod';

const idString = z.string().min(1);
const isoString = z.string().min(1);

export const conversationSchema = z.object({
  id: idString,
  participantIds: z.array(idString).length(2, '1:1 conversations only'),
  lastMessagePreview: z.string(),
  lastMessageAt: isoString,
  unreadCountByUser: z.record(z.string(), z.number().int().nonnegative()),
  createdAt: isoString,
});

export const messageSchema = z.object({
  id: idString,
  conversationId: idString,
  authorId: idString,
  body: z.string().min(1).max(1000),
  createdAt: isoString,
  readBy: z.array(idString),
});

export const messageStoreSchema = z.object({
  conversations: z.array(conversationSchema),
  messages: z.array(messageSchema),
});

export type ConversationValidated = z.infer<typeof conversationSchema>;
export type MessageValidated = z.infer<typeof messageSchema>;

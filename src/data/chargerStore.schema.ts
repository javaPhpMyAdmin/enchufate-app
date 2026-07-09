/**
 * Zod schemas describing the on-disk charger shape used by the store.
 *
 * Kept separate from the publish-flow schemas (which validate user input on
 * the wizard) because the store schema is more permissive: it only needs to
 * guarantee the data we read from / write to AsyncStorage is consistent
 * with the `Charger` type defined in `data/types.ts`.
 */
import { z } from 'zod';

export const latLngSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

const statusSchema = z.enum(['available', 'reserved', 'busy']);
const connectorSchema = z.enum(['type1', 'type2', 'ccs', 'chademo', 'tesla']);

export const chargerSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  title: z.string(),
  description: z.string(),
  type: connectorSchema,
  powerKw: z.number().positive(),
  pricePerHour: z.number().nonnegative(),
  status: statusSchema,
  availableInMinutes: z.number().int().nonnegative().optional(),
  location: latLngSchema,
  address: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  amenities: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  joinedAt: z.string().optional(),
});

export const newChargerInputSchema = z.object({
  ownerId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  type: connectorSchema,
  powerKw: z.number().positive(),
  pricePerHour: z.number().nonnegative(),
  location: latLngSchema,
  address: z.string().min(1),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  photos: z.array(z.string()).min(1),
  status: statusSchema.optional(),
  joinedAt: z.string().optional(),
});

export type NewChargerInputValidated = z.infer<typeof newChargerInputSchema>;

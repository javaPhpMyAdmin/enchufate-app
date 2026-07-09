/**
 * Zod schemas for the profile feature.
 *
 * `editProfileSchema` validates the edit-profile form. It mirrors the
 * `registerSchema` field set with one extra: `bio` (optional, max 200,
 * only relevant for hosts — the form hides it for non-hosts, but the
 * schema still accepts it).
 */
import { z } from 'zod';

const MIN_NAME = 2;
const MAX_BIO = 200;
const MIN_PHONE_DIGITS = 8;

export const editProfileSchema = z.object({
  name: z.string().min(MIN_NAME, 'Ingresá tu nombre'),
  surname: z.string().min(MIN_NAME, 'Ingresá tu apellido'),
  email: z.string().email('Ingresá un email válido'),
  phone: z
    .string()
    .optional()
    .transform((value) => (value ? value.replace(/\D/g, '') : ''))
    .pipe(
      z
        .string()
        .refine(
          (digits) => digits.length === 0 || digits.length >= MIN_PHONE_DIGITS,
          'Ingresá un teléfono válido (mínimo 8 dígitos)',
        ),
    ),
  city: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ''),
  bio: z
    .string()
    .max(MAX_BIO, `La bio no puede superar los ${MAX_BIO} caracteres`)
    .optional()
    .transform((value) => value?.trim() ?? ''),
  /** Persisted as `avatarUrl`; not user-edited directly. */
  avatarUrl: z.string().url().or(z.literal('')),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;

/**
 * Zod schemas for the auth feature.
 *
 * These double as the single source of truth for both client-side validation
 * (via react-hook-form's zodResolver) and the shape of the data passed to
 * `signIn` / `signUp`. Keep error messages short and user-facing — they
 * appear inline in the form.
 */
import { z } from 'zod';

const MIN_PASSWORD_LOGIN = 6;
const MIN_PASSWORD_SIGNUP = 8;
const MIN_NAME = 2;
const MIN_PHONE_DIGITS = 8;

/**
 * Login form.
 * - email must be RFC-valid
 * - password >= 6 characters
 */
export const loginSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z
    .string()
    .min(MIN_PASSWORD_LOGIN, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Registration form.
 * - name / surname / city >= 2 chars
 * - email must be RFC-valid
 * - phone: 8+ digit number (we accept any chars the user types and validate
 *   by digit count — the "+54 " prefix is applied at display time)
 * - password >= 8 chars and at least one digit
 * - confirmPassword must match password
 */
export const registerSchema = z
  .object({
    name: z.string().min(MIN_NAME, 'Ingresá tu nombre'),
    surname: z.string().min(MIN_NAME, 'Ingresá tu apellido'),
    email: z.string().email('Ingresá un email válido'),
    phone: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .pipe(
        z
          .string()
          .min(MIN_PHONE_DIGITS, 'Ingresá un teléfono válido (mínimo 8 dígitos)'),
      ),
    city: z.string().min(MIN_NAME, 'Ingresá tu ciudad'),
    password: z
      .string()
      .min(
        MIN_PASSWORD_SIGNUP,
        'La contraseña debe tener al menos 8 caracteres',
      )
      .regex(/[0-9]/, 'La contraseña debe incluir al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type RegisterInput = z.infer<typeof registerSchema>;

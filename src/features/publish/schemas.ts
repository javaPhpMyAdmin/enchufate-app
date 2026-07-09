/**
 * Zod schemas — one per wizard step — used by both RHF and the publish
 * provider's `isStepValid(step)` checks. Error messages are in Spanish
 * because they appear inline in the form.
 */
import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeString = z
  .string()
  .regex(TIME_REGEX, 'Usá el formato HH:mm (24 h)');

// ---------------------------------------------------------------------------
// Step 1 — title + description
// ---------------------------------------------------------------------------

export const step1Schema = z.object({
  title: z
    .string()
    .min(4, 'El título debe tener al menos 4 caracteres')
    .max(60, 'Máximo 60 caracteres'),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'Máximo 500 caracteres'),
});

// ---------------------------------------------------------------------------
// Step 2 — location + address
// ---------------------------------------------------------------------------

export const step2Schema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  address: z
    .string()
    .min(3, 'Ingresá una dirección o referencia')
    .max(140, 'Máximo 140 caracteres'),
});

// ---------------------------------------------------------------------------
// Step 3 — connector + power
// ---------------------------------------------------------------------------

export const step3Schema = z.object({
  connectorType: z.enum(['type1', 'type2', 'ccs', 'chademo', 'tesla'], {
    errorMap: () => ({ message: 'Elegí un tipo de conector' }),
  }),
  powerKw: z
    .number({ invalid_type_error: 'Ingresá la potencia en kW' })
    .min(3.7, 'La potencia mínima es 3.7 kW')
    .max(350, 'La potencia máxima es 350 kW'),
});

// ---------------------------------------------------------------------------
// Step 4 — photos
// ---------------------------------------------------------------------------

export const step4Schema = z.object({
  photoUrls: z
    .array(z.string().url())
    .min(1, 'Elegí al menos una foto')
    .max(5, 'Máximo 5 fotos'),
});

// ---------------------------------------------------------------------------
// Step 5 — price + min rental time
// ---------------------------------------------------------------------------

export const step5Schema = z.object({
  pricePerHour: z
    .number({ invalid_type_error: 'Ingresá un precio por hora' })
    .min(1, 'El precio mínimo es USD 1 por hora')
    .max(50, 'El precio máximo es USD 50 por hora'),
  minRentalMinutes: z
    .number({ invalid_type_error: 'Elegí un tiempo mínimo' })
    .int()
    .refine((v) => [30, 60, 120, 240, 480].includes(v), {
      message: 'Elegí una de las opciones disponibles',
    }),
});

// ---------------------------------------------------------------------------
// Step 6 — weekly schedule
// ---------------------------------------------------------------------------

const dayScheduleSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    startTime: timeString,
    endTime: timeString,
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) return;
    if (value.startTime >= value.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'La hora de fin debe ser posterior a la de inicio',
      });
    }
  });

export const step6Schema = z.object({
  schedule: z.array(dayScheduleSchema).length(7, 'La semana debe tener 7 días'),
});

// ---------------------------------------------------------------------------
// Step 7 — owner rules
// ---------------------------------------------------------------------------

export const step7Schema = z.object({
  rules: z
    .string()
    .max(300, 'Máximo 300 caracteres')
    .optional(),
});

// ---------------------------------------------------------------------------
// End-to-end draft validation
// ---------------------------------------------------------------------------

export const fullDraftSchema = z.object({
  step1: step1Schema,
  step2: step2Schema,
  step3: step3Schema,
  step4: step4Schema,
  step5: step5Schema,
  step6: step6Schema,
  step7: step7Schema.optional(),
});

export type Step1Input = z.infer<typeof step1Schema>;
export type Step2Input = z.infer<typeof step2Schema>;
export type Step3Input = z.infer<typeof step3Schema>;
export type Step4Input = z.infer<typeof step4Schema>;
export type Step5Input = z.infer<typeof step5Schema>;
export type Step6Input = z.infer<typeof step6Schema>;
export type Step7Input = z.infer<typeof step7Schema>;
export type FullDraft = z.infer<typeof fullDraftSchema>;

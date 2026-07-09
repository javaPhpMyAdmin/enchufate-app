/**
 * Public types for the publish wizard feature.
 *
 * The draft is split into 7 step payloads, each optional so the user can
 * abandon mid-wizard and resume later. `editingId` is set when the user
 * opens the wizard from "Editar" — the submit step will then call
 * `chargerStore.update` instead of `chargerStore.add`.
 */
import type { LatLng } from '@/data/types';
import type { ConnectorType } from '@/data/types';

/** A time string in 24-hour `HH:mm` format. */
export type TimeString = string;

/** Day of the week, 0 = Sunday .. 6 = Saturday. */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DaySchedule {
  day: DayIndex;
  enabled: boolean;
  startTime: TimeString;
  endTime: TimeString;
}

export type WeeklySchedule = readonly [
  DaySchedule,
  DaySchedule,
  DaySchedule,
  DaySchedule,
  DaySchedule,
  DaySchedule,
  DaySchedule,
];

export interface Step1Data {
  title: string;
  description: string;
}

export interface Step2Data {
  location: LatLng;
  address: string;
}

export interface Step3Data {
  connectorType: ConnectorType;
  powerKw: number;
}

export interface Step4Data {
  photoUrls: string[];
}

export interface Step5Data {
  pricePerHour: number;
  minRentalMinutes: number;
}

export interface Step6Data {
  schedule: WeeklySchedule;
}

export interface Step7Data {
  rules?: string;
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WIZARD_TOTAL_STEPS = 7 as const;

export const WIZARD_STEP_NAMES: Record<WizardStep, string> = {
  1: 'Nombre y descripción',
  2: 'Ubicación',
  3: 'Conector y potencia',
  4: 'Fotos',
  5: 'Precio y tiempo',
  6: 'Disponibilidad',
  7: 'Reglas',
};

export interface ChargerDraft {
  step1?: Step1Data;
  step2?: Step2Data;
  step3?: Step3Data;
  step4?: Step4Data;
  step5?: Step5Data;
  step6?: Step6Data;
  step7?: Step7Data;
  /** When set, the submit step will update this charger instead of creating a new one. */
  editingId?: string;
}

export const DAY_LABELS: Record<DayIndex, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const DAY_SHORT_LABELS: Record<DayIndex, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

/** Build a default 7-day schedule: all days enabled, 09:00 to 18:00. */
export function buildDefaultSchedule(): WeeklySchedule {
  const days: DaySchedule[] = [];
  for (let day = 0; day < 7; day++) {
    days.push({
      day: day as DayIndex,
      enabled: true,
      startTime: '09:00',
      endTime: '18:00',
    });
  }
  return days as unknown as WeeklySchedule;
}

/** Min-rental options presented in step 5. */
export const MIN_RENTAL_OPTIONS: ReadonlyArray<{
  label: string;
  minutes: number;
}> = [
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '4 h', minutes: 240 },
  { label: '8 h', minutes: 480 },
];

/**
 * Publish feature — public surface.
 *
 * Screens and components should import from this barrel so the internal
 * folder layout can evolve without breaking call sites.
 */
export {
  PublishProvider,
  usePublishDraft,
  type PublishContextValue,
  type PublishProviderProps,
} from './PublishProvider';

export {
  chargerToDraft,
  clearDraft as clearPersistedDraft,
  loadDraft,
  saveDraft,
} from './publishStorage';

export {
  fullDraftSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
  type FullDraft,
  type Step1Input,
  type Step2Input,
  type Step3Input,
  type Step4Input,
  type Step5Input,
  type Step6Input,
  type Step7Input,
} from './schemas';

export {
  buildDefaultSchedule,
  DAY_LABELS,
  DAY_SHORT_LABELS,
  MIN_RENTAL_OPTIONS,
  WIZARD_STEP_NAMES,
  WIZARD_TOTAL_STEPS,
  type ChargerDraft,
  type DayIndex,
  type DaySchedule,
  type Step1Data,
  type Step2Data,
  type Step3Data,
  type Step4Data,
  type Step5Data,
  type Step6Data,
  type Step7Data,
  type TimeString,
  type WeeklySchedule,
  type WizardStep,
} from './types';

export { useCanPublish, type CanPublishResult } from './useCanPublish';

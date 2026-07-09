/**
 * PublishProvider — owns the in-progress wizard draft.
 *
 * The provider does NOT talk to the charger store directly. Submission is
 * handled in `app/publish/rules.tsx` (step 7) which calls `usePublishDraft`
 * to read the final draft, validates it against `fullDraftSchema`, and then
 * invokes `chargerStore.add` / `chargerStore.update`. Keeping submission
 * outside the provider means the success screen can re-read a clean store
 * without us juggling optimistic state.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  clearDraft as clearPersistedDraft,
  loadDraft,
  saveDraft,
} from './publishStorage';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
} from './schemas';
import type {
  ChargerDraft,
  DayIndex,
  DaySchedule,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  Step7Data,
  WeeklySchedule,
  WizardStep,
} from './types';
import { buildDefaultSchedule } from './types';

export interface PublishContextValue {
  draft: ChargerDraft;
  editingId: string | null;
  hydrated: boolean;
  /** True when the step's data is present and passes its Zod schema. */
  isStepValid: (step: WizardStep) => boolean;
  /** Patch a single step. Partial patches are merged into the existing payload. */
  update: {
    (step: 1, patch: Partial<Step1Data>): void;
    (step: 2, patch: Partial<Step2Data>): void;
    (step: 3, patch: Partial<Step3Data>): void;
    (step: 4, patch: Partial<Step4Data>): void;
    (step: 5, patch: Partial<Step5Data>): void;
    (step: 6, patch: Partial<Step6Data>): void;
    (step: 7, patch: Partial<Step7Data>): void;
  };
  /** Replace the schedule for a single day. */
  updateDay: (day: DayIndex, patch: Partial<DaySchedule>) => void;
  /** Replace the whole draft (used by the "Editar" entry point). */
  replaceDraft: (next: ChargerDraft) => void;
  /** Mark a charger as the one being edited. */
  setEditingId: (id: string | null) => void;
  /** Clear the draft and AsyncStorage. */
  reset: () => Promise<void>;
}

const PublishContext = createContext<PublishContextValue | undefined>(undefined);

export interface PublishProviderProps {
  children: React.ReactNode;
  /**
   * When true, the provider will load the persisted draft on mount. Set to
   * false in tests or when the caller wants to manage hydration manually.
   */
  hydrate?: boolean;
}

function isStep1(value: ChargerDraft['step1']): value is Step1Data {
  return !!value && step1Schema.safeParse(value).success;
}
function isStep2(value: ChargerDraft['step2']): value is Step2Data {
  return !!value && step2Schema.safeParse(value).success;
}
function isStep3(value: ChargerDraft['step3']): value is Step3Data {
  return !!value && step3Schema.safeParse(value).success;
}
function isStep4(value: ChargerDraft['step4']): value is Step4Data {
  return !!value && step4Schema.safeParse(value).success;
}
function isStep5(value: ChargerDraft['step5']): value is Step5Data {
  return !!value && step5Schema.safeParse(value).success;
}
function isStep6(value: ChargerDraft['step6']): value is Step6Data {
  return !!value && step6Schema.safeParse({ schedule: value.schedule }).success;
}
function isStep7(value: ChargerDraft['step7']): value is Step7Data {
  // step 7 is optional: it's valid if the field is missing, the value is
  // an empty string, or the value is a non-empty string within 300 chars.
  if (value === undefined) return true;
  const result = step7Schema.safeParse(value);
  return result.success;
}

export function PublishProvider({
  children,
  hydrate = true,
}: PublishProviderProps): React.JSX.Element {
  const [draft, setDraft] = useState<ChargerDraft>({});
  const [hydrated, setHydrated] = useState<boolean>(!hydrate);
  // We persist asynchronously; this ref guards against racing the save
  // against a stale closure.
  const draftRef = useRef<ChargerDraft>(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!hydrate) return;
    let cancelled = false;
    (async () => {
      const stored = await loadDraft();
      if (cancelled) return;
      if (stored) {
        setDraft(stored);
        draftRef.current = stored;
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const persist = useCallback((next: ChargerDraft): void => {
    // Fire-and-forget: storage failures should not block the wizard.
    void saveDraft(next);
  }, []);

  const update = useCallback(
    (step: WizardStep, patch: Record<string, unknown>): void => {
      setDraft((current) => {
        const next = applyStepPatch(current, step, patch);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateDay = useCallback(
    (day: DayIndex, patch: Partial<DaySchedule>): void => {
      setDraft((current) => {
        const schedule: WeeklySchedule =
          current.step6?.schedule ?? buildDefaultSchedule();
        const updated = schedule.map((entry) =>
          entry.day === day ? { ...entry, ...patch } : entry,
        ) as unknown as WeeklySchedule;
        const next: ChargerDraft = {
          ...current,
          step6: { schedule: updated },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const replaceDraft = useCallback(
    (next: ChargerDraft): void => {
      setDraft(next);
      persist(next);
    },
    [persist],
  );

  const setEditingId = useCallback(
    (id: string | null): void => {
      setDraft((current) => {
        const next: ChargerDraft = { ...current };
        if (id) {
          next.editingId = id;
        } else {
          delete next.editingId;
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(async (): Promise<void> => {
    setDraft({});
    draftRef.current = {};
    await clearPersistedDraft();
  }, []);

  const isStepValid = useCallback(
    (step: WizardStep): boolean => {
      switch (step) {
        case 1:
          return isStep1(draft.step1);
        case 2:
          return isStep2(draft.step2);
        case 3:
          return isStep3(draft.step3);
        case 4:
          return isStep4(draft.step4);
        case 5:
          return isStep5(draft.step5);
        case 6:
          return isStep6(draft.step6);
        case 7:
          return isStep7(draft.step7);
        default:
          return false;
      }
    },
    [draft],
  );

  const value = useMemo<PublishContextValue>(
    () => ({
      draft,
      editingId: draft.editingId ?? null,
      hydrated,
      isStepValid,
      update: update as PublishContextValue['update'],
      updateDay,
      replaceDraft,
      setEditingId,
      reset,
    }),
    [draft, hydrated, isStepValid, update, updateDay, replaceDraft, setEditingId, reset],
  );

  return (
    <PublishContext.Provider value={value}>{children}</PublishContext.Provider>
  );
}

function applyStepPatch(
  current: ChargerDraft,
  step: WizardStep,
  patch: Record<string, unknown>,
): ChargerDraft {
  switch (step) {
    case 1:
      return {
        ...current,
        step1: { ...(current.step1 ?? { title: '', description: '' }), ...(patch as Partial<Step1Data>) },
      };
    case 2:
      return {
        ...current,
        step2: {
          ...(current.step2 ?? {
            location: { latitude: 0, longitude: 0 },
            address: '',
          }),
          ...(patch as Partial<Step2Data>),
        },
      };
    case 3:
      return {
        ...current,
        step3: {
          ...(current.step3 ?? { connectorType: 'type2', powerKw: 0 }),
          ...(patch as Partial<Step3Data>),
        },
      };
    case 4:
      return {
        ...current,
        step4: { ...(current.step4 ?? { photoUrls: [] }), ...(patch as Partial<Step4Data>) },
      };
    case 5:
      return {
        ...current,
        step5: {
          ...(current.step5 ?? { pricePerHour: 0, minRentalMinutes: 60 }),
          ...(patch as Partial<Step5Data>),
        },
      };
    case 6:
      return {
        ...current,
        step6: { ...(current.step6 ?? { schedule: buildDefaultSchedule() }), ...(patch as Partial<Step6Data>) },
      };
    case 7:
      return {
        ...current,
        step7: { ...(current.step7 ?? { rules: '' }), ...(patch as Partial<Step7Data>) },
      };
    default:
      return current;
  }
}

export function usePublishDraft(): PublishContextValue {
  const ctx = useContext(PublishContext);
  if (!ctx) {
    throw new Error('usePublishDraft must be used inside a PublishProvider');
  }
  return ctx;
}

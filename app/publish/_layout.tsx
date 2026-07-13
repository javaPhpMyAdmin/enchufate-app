/**
 * Wizard layout — wraps the whole `/publish` stack in `PublishProvider`
 * and provides the shared chrome (cancel button, progress bar) for
 * every step.
 *
 * Auth gate: publishing requires a signed-in user. Unauthed visitors
 * are redirected to `/(public)/login?redirect=/publish`; after a
 * successful sign-in the login screen sends them back to the wizard.
 *
 * Edit mode: when the user navigates to `/publish?edit=<chargerId>`, the
 * layout pre-fills the draft with the charger's data. The wizard itself
 * is the same — submit just dispatches to `update` instead of `add`.
 */
import {
  Redirect,
  Stack,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';

import { useTheme } from '@/theme';
import {
  chargerToDraft,
  PublishProvider,
  usePublishDraft,
  type ChargerDraft,
  type WizardStep,
} from '@/features/publish';
import { WizardProgress } from '@/components/publish';
import { useAuth } from '@/features/auth';
import { chargerStore } from '@/data/chargerStore';

const STEP_BY_SEGMENT: Record<string, WizardStep> = {
  '/publish': 1,
  '/publish/index': 1,
  '/publish/location': 2,
  '/publish/specs': 3,
  '/publish/photos': 4,
  '/publish/pricing': 5,
  '/publish/availability': 6,
  '/publish/rules': 7,
  '/publish/success': 7,
};

function resolveStep(pathname: string): WizardStep {
  // Strip query string and pick the longest matching prefix.
  const clean = pathname.split('?')[0] ?? pathname;
  let best: WizardStep | null = null;
  for (const [prefix, step] of Object.entries(STEP_BY_SEGMENT)) {
    if (clean === prefix || clean.startsWith(`${prefix}/`)) {
      if (best === null || step > best) best = step;
    }
  }
  return best ?? 1;
}

export default function PublishLayout(): React.JSX.Element {
  return (
    <PublishAuthGate>
      <PublishProvider>
        <WizardChrome>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="location" />
            <Stack.Screen name="specs" />
            <Stack.Screen name="photos" />
            <Stack.Screen name="pricing" />
            <Stack.Screen name="availability" />
            <Stack.Screen name="rules" />
            <Stack.Screen name="success" />
          </Stack>
        </WizardChrome>
      </PublishProvider>
    </PublishAuthGate>
  );
}

// ---------------------------------------------------------------------------
// PublishAuthGate — redirects unauthed visitors to the login screen with
// a `?redirect=/publish` query so they land back on the wizard after
// signing in. While the auth status is still resolving we render the
// splash (the same one the root layout uses) to avoid a flash of the
// wizard chrome.
// ---------------------------------------------------------------------------

function PublishAuthGate({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { status } = useAuth();
  const theme = useTheme();

  if (status === 'loading') {
    return (
      <View
        style={[styles.gateRoot, { backgroundColor: theme.colors.primary }]}
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando"
      >
        <ActivityIndicator color={theme.colors.textOnPrimary} />
      </View>
    );
  }
  if (status === 'unauthenticated') {
    return <Redirect href="/(public)/login?redirect=/publish" />;
  }
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// WizardChrome — owns the cancel button and the progress bar so the
// individual step screens stay focused on their form fields.
// ---------------------------------------------------------------------------

function WizardChrome({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { hydrated, replaceDraft, reset, editingId } = usePublishDraft();
  const params = useLocalSearchParams<{ edit?: string | string[] }>();
  const editParam = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const pathname = usePathname();
  const currentStep = resolveStep(pathname);

  const [editHydrated, setEditHydrated] = useState<boolean>(!editParam);

  useEffect(() => {
    if (!editParam) {
      setEditHydrated(true);
      return;
    }
    if (editingId === editParam) {
      setEditHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const existing = chargerStore.byId(editParam);
      if (!existing) {
        if (!cancelled) setEditHydrated(true);
        return;
      }
      const next: ChargerDraft = chargerToDraft(existing);
      if (!cancelled) {
        replaceDraft(next);
        setEditHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editParam, editingId, replaceDraft]);

  const handleCancel = (): void => {
    void reset().then(() => {
      router.replace('/(tabs)');
    });
  };

  const showLoading = !hydrated || !editHydrated;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      <View
        style={[
          styles.topBar,
          {
            borderBottomColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.sm,
          },
        ]}
      >
        <Pressable
          onPress={handleCancel}
          hitSlop={8}
          accessibilityLabel="Cancelar publicación"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cancelButton,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.full,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <X color={theme.colors.text} size={18} />
          <Text
            style={[
              theme.typography.smallBold,
              { color: theme.colors.text, marginLeft: 6 },
            ]}
          >
            Cancelar
          </Text>
        </Pressable>
        <View style={styles.progressWrap}>
          <WizardProgress currentStep={currentStep} />
        </View>
      </View>
      {showLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gateRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  progressWrap: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

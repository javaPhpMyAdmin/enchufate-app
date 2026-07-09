/**
 * Inicio tab — "Mis cargadores" (owner dashboard).
 *
 * Replaces the previous placeholder. Three modes:
 *   - unauthenticated: friendly copy + login CTA.
 *   - authenticated, no chargers: empty state with "Publicar mi primer cargador".
 *   - authenticated, with chargers: list of `OwnerChargerCard`s and a
 *     "Publicar nuevo" CTA in the header.
 *
 * Tapping a card body re-uses the same `ChargerDetailSheet` from the map
 * screen. Tapping the overflow menu on a card exposes Editar / Eliminar
 * — Eliminar opens `DeleteConfirmModal`, which on confirm calls the
 * store and shows a small toast.
 */
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { Plus, Zap } from 'lucide-react-native';

import { Button, EmptyState, Screen } from '@/components/ui';
import {
  DeleteConfirmModal,
  OwnerChargerCard,
} from '@/components/charger';
import {
  ChargerDetailSheet,
  type ChargerDetailSheetHandle,
} from '@/components/sheets';
import { useAuth } from '@/features/auth';
import { chargerStore, useMyChargers } from '@/data/chargerStore';
import { mockUsers } from '@/data/mocks/users';
import type { Charger, User } from '@/data/types';
import { useTheme } from '@/theme';

export default function InicioScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { session, status } = useAuth();
  const ownerId = session?.user.id ?? null;
  const chargers = useMyChargers(ownerId);
  const detailSheetRef = useRef<ChargerDetailSheetHandle | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Charger | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Build a `User` record for the detail sheet. The host's signed-in
  // session supplies a fallback so newly published chargers (no entry
  // in the seed) still render correctly.
  const selfUser: User | null = useMemo(() => {
    if (!session) return null;
    const u = session.user;
    return {
      ...u,
      // Hosts are always hosts in the owner dashboard.
      isHost: true,
      rating: u.rating || 5,
    };
  }, [session]);

  // The flat `User` index lets us resolve seed owners quickly.
  const userIndex = useMemo<Record<string, User>>(() => {
    const map: Record<string, User> = {};
    for (const u of mockUsers) map[u.id] = u;
    return map;
  }, []);

  const handlePublish = useCallback((): void => {
    if (status !== 'authenticated') {
      router.push('/(public)/login');
      return;
    }
    router.push('/publish');
  }, [router, status]);

  const handleOpenDetail = useCallback(
    (id: string) => {
      const c = chargerStore.byId(id);
      if (!c) return;
      const owner = userIndex[c.ownerId] ?? selfUser;
      if (!owner) return;
      detailSheetRef.current?.show(c, owner);
    },
    [userIndex, selfUser],
  );

  const handleEdit = useCallback(
    (id: string) => {
      router.push({ pathname: '/publish', params: { edit: id } });
    },
    [router],
  );

  const handleDeletePrompt = useCallback((id: string) => {
    const c = chargerStore.byId(id);
    if (c) setPendingDelete(c);
  }, []);

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await chargerStore.remove(pendingDelete.id);
      setPendingDelete(null);
      Alert.alert(
        'Cargador eliminado',
        'Tu cargador ya no está visible en el mapa.',
      );
    } catch (err) {
      console.warn('[inicio] delete failed', err);
      Alert.alert('Error', 'No pudimos eliminar tu cargador. Probá de nuevo.');
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Charger>) => (
      <View style={{ marginBottom: 12 }}>
        <OwnerChargerCard
          charger={item}
          onPress={handleOpenDetail}
          onEdit={handleEdit}
          onDelete={handleDeletePrompt}
        />
      </View>
    ),
    [handleOpenDetail, handleEdit, handleDeletePrompt],
  );

  // -------------------------------------------------------------------------
  // Render: unauthenticated
  // -------------------------------------------------------------------------
  if (status !== 'authenticated' || !session) {
    return (
      <Screen scroll={false} edges={['top']}>
        <View style={styles.header}>
          <Text style={[theme.typography.h1, { color: theme.colors.text }]}>
            Mis cargadores
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginTop: 6 },
            ]}
          >
            Publicá tu cargador y empezá a generar ingresos con tu EV.
          </Text>
        </View>
        <EmptyState
          icon={<Zap color={theme.colors.textMuted} size={36} />}
          title="Iniciá sesión para publicar"
          message="Necesitás una cuenta para gestionar tus cargadores y ver tus reservas."
          actionLabel="Iniciá sesión"
          onAction={() => router.push('/(public)/login')}
        />
      </Screen>
    );
  }

  // -------------------------------------------------------------------------
  // Render: authenticated, no chargers
  // -------------------------------------------------------------------------
  if (chargers.length === 0) {
    return (
      <Screen scroll={false} edges={['top']}>
        <View style={styles.header}>
          <Text style={[theme.typography.h1, { color: theme.colors.text }]}>
            Mis cargadores
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginTop: 6 },
            ]}
          >
            Publicá tu cargador y empezá a generar ingresos con tu EV.
          </Text>
        </View>
        <EmptyState
          icon={<Zap color={theme.colors.textMuted} size={36} />}
          title="Todavía no publicaste ningún cargador"
          message="Compartí tu cargador EV con la comunidad y empezá a ganar."
          actionLabel="Publicar mi primer cargador"
          onAction={handlePublish}
        />
      </Screen>
    );
  }

  // -------------------------------------------------------------------------
  // Render: authenticated, with chargers
  // -------------------------------------------------------------------------
  return (
    <View style={styles.root}>
      <Screen edges={['top']} scroll={false} contentStyle={styles.listContent}>
        <FlatList
          data={chargers}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listInner}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text
                  style={[theme.typography.h1, { color: theme.colors.text, flex: 1 }]}
                >
                  Mis cargadores
                </Text>
                <Pressable
                  onPress={handlePublish}
                  accessibilityLabel="Publicar nuevo cargador"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.publishButton,
                    {
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.radii.full,
                    },
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Plus color={theme.colors.textOnPrimary} size={18} />
                  <Text
                    style={[
                      theme.typography.smallBold,
                      { color: theme.colors.textOnPrimary, marginLeft: 4 },
                    ]}
                  >
                    Publicar nuevo
                  </Text>
                </Pressable>
              </View>
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.textMuted, marginTop: 6 },
                ]}
              >
                {`${chargers.length} ${chargers.length === 1 ? 'cargador publicado' : 'cargadores publicados'}`}
              </Text>
            </View>
          }
        />
      </Screen>
      <ChargerDetailSheet
        ref={detailSheetRef}
        onContact={(ownerId) => console.log('[inicio] contactar', ownerId)}
        onViewProfile={(ownerId) => console.log('[inicio] ver perfil', ownerId)}
      />
      <DeleteConfirmModal
        visible={!!pendingDelete}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { flex: 1 },
  listInner: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});

/**
 * Profile tab.
 *
 * Two modes driven by the auth status:
 *   - unauthenticated: welcoming copy + "Iniciá sesión" CTA.
 *   - authenticated: full profile screen — header, stats, "Mis cargadores"
 *     section (moved from the Home tab when that became a marketing
 *     landing), "Editar perfil" / "Ver mi perfil público" action buttons,
 *     and a "Preferencias" menu with 5 stub items.
 *
 * The "Mis cargadores" section shows the host's own chargers (with the
 * same overflow menu — Editar / Eliminar — used in the old home tab).
 *
 * Stub menu items fire an `Alert.alert("Próximamente", …)` and disappear
 * once Phase 9 wires up real notification settings, payment methods, etc.
 */
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import {
  Bell,
  CreditCard,
  HelpCircle,
  Lock,
  LogOut,
  Plus,
  ScrollText,
  Share2,
} from 'lucide-react-native';

import {
  AlertModal,
  Avatar,
  Button,
  Card,
  CardBody,
  Divider,
  Screen,
  type AlertModalVariant,
} from '@/components/ui';
import {
  DeleteConfirmModal,
  OwnerChargerCard,
} from '@/components/charger';
import {
  ProfileHeader,
  ProfileMenuItem,
  ProfileSkeleton,
  ProfileStats,
} from '@/components/profile';
import { useAuth } from '@/features/auth';
import { chargerStore, useMyChargers } from '@/data/chargerStore';
import type { Charger } from '@/data/types';
import { useTheme } from '@/theme';

export default function ProfileScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { status, session, signOut } = useAuth();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    variant: AlertModalVariant;
    actionLabel?: string;
    onAction?: () => void;
  }>({ title: '', variant: 'info' });

  const handleLogin = (): void => {
    router.push('/(public)/login');
  };

  const handleEdit = (): void => {
    router.push('/profile/edit');
  };

  const handleViewPublicProfile = (): void => {
    if (session?.user.id) {
      router.push(`/profile/${session.user.id}`);
    }
  };

  const handleLogout = useCallback((): void => {
    setAlertConfig({
      title: 'Cerrar sesión',
      message: '¿Estás seguro que querés salir de tu cuenta?',
      variant: 'confirm',
      actionLabel: 'Cerrar sesión',
      onAction: async () => {
        await signOut();
        router.replace('/(tabs)');
      },
    });
    setAlertVisible(true);
  }, [router, signOut]);

  const handleStub = (label: string) => {
    setAlertConfig({
      title: 'Próximamente',
      message: `${label} llega en una próxima versión.`,
      variant: 'info',
    });
    setAlertVisible(true);
  };

  // Unauthenticated: centered welcome + login CTA.
  if (status === 'loading' || !session) {
    return (
      <Screen scroll={false} edges={['top']}>
        <View style={styles.unauth}>
          <Avatar name="Conductor Enchufate" size="xl" />
          <Text
            style={[
              theme.typography.h2,
              { color: theme.colors.text, marginTop: theme.spacing.md },
            ]}
          >
            Bienvenido
          </Text>
          <Text
            style={[
              theme.typography.body,
              {
                color: theme.colors.textMuted,
                marginTop: 6,
                textAlign: 'center',
                maxWidth: 320,
              },
            ]}
          >
            Iniciá sesión para gestionar tu cuenta, ver tus reservas y
            publicar tu cargador.
          </Text>
          <View style={styles.unauthCta}>
            <Button
              label="Iniciá sesión"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleLogin}
            />
          </View>
        </View>
        <AlertModal
          visible={alertVisible}
          onClose={() => setAlertVisible(false)}
          title={alertConfig.title}
          message={alertConfig.message}
          variant={alertConfig.variant}
          actionLabel={alertConfig.actionLabel}
          onAction={alertConfig.onAction}
        />
      </Screen>
    );
  }

  return (
    <>
      <ProfileBody
        userId={session.user.id}
        isHost={session.user.isHost}
        rating={session.user.rating}
        reviewCount={session.user.reviewCount}
        onEdit={handleEdit}
        onViewPublic={handleViewPublicProfile}
        onLogout={handleLogout}
        onStubPress={handleStub}
      />
      <AlertModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        variant={alertConfig.variant}
        actionLabel={alertConfig.actionLabel}
        onAction={alertConfig.onAction}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Authenticated body — kept as a separate component so the main
// `ProfileScreen` reads top-to-bottom and so the unauthenticated branch
// short-circuits cleanly.
//
// Also owns the "Mis cargadores" section (moved from the old Home tab).
// ---------------------------------------------------------------------------

interface ProfileBodyProps {
  userId: string;
  isHost: boolean;
  rating: number;
  reviewCount: number;
  onEdit: () => void;
  onViewPublic: () => void;
  onLogout: () => void;
  onStubPress: (label: string) => void;
}

function ProfileBody({
  userId,
  isHost,
  rating,
  reviewCount,
  onEdit,
  onViewPublic,
  onLogout,
  onStubPress,
}: ProfileBodyProps): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { chargers, isLoading } = useMyChargers(userId);
  const [pendingDelete, setPendingDelete] = useState<Charger | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    variant: AlertModalVariant;
  }>({ title: '', variant: 'info' });

  // Show skeleton while chargers are loading
  if (isLoading && chargers.length === 0) {
    return <ProfileSkeleton />;
  }

  // The current user is always a "host" if they have at least one charger,
  // even if their account wasn't created with the isHost flag set.
  const showStats = isHost || chargers.length > 0;

  const handlePublish = (): void => {
    router.push('/publish');
  };

  // Tap a charger card → navigate to map with that charger selected.
  const handleOpenDetail = (id: string) => {
    router.push({ pathname: '/(tabs)/map', params: { select: id } });
  };

  const handleEditCharger = (id: string) => {
    router.push({ pathname: '/publish', params: { edit: id } });
  };

  const handleDeletePrompt = useCallback((id: string) => {
    const c = chargerStore.byId(id);
    if (c) setPendingDelete(c);
  }, []);

  const handleToggleBusy = useCallback(
    async (id: string, durationMinutes: number) => {
      try {
        await chargerStore.toggleBusy(id, durationMinutes);
      } catch (err) {
        console.warn('[profile] toggleBusy failed', err);
        setAlertConfig({
          title: 'Error',
          message: 'No pudimos cambiar el estado del cargador.',
          variant: 'error',
        });
        setAlertVisible(true);
      }
    },
    [],
  );

  const handleSetAvailable = useCallback(async (id: string) => {
    try {
      await chargerStore.setAvailable(id);
    } catch (err) {
      console.warn('[profile] setAvailable failed', err);
      setAlertConfig({
        title: 'Error',
        message: 'No pudimos cambiar el estado del cargador.',
        variant: 'error',
      });
      setAlertVisible(true);
    }
  }, []);

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await chargerStore.remove(pendingDelete.id);
      setPendingDelete(null);
      setAlertConfig({
        title: 'Cargador eliminado',
        message: 'Tu cargador ya no está visible en el mapa.',
        variant: 'success',
      });
      setAlertVisible(true);
    } catch (err) {
      console.warn('[profile] delete failed', err);
      setAlertConfig({
        title: 'Error',
        message: 'No pudimos eliminar tu cargador. Probá de nuevo.',
        variant: 'error',
      });
      setAlertVisible(true);
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

  const renderChargerItem = useCallback(
    ({ item }: ListRenderItemInfo<Charger>) => (
      <View style={styles.chargerItem}>
        <OwnerChargerCard
          charger={item}
          onPress={handleOpenDetail}
          onEdit={handleEditCharger}
          onDelete={handleDeletePrompt}
          onToggleBusy={handleToggleBusy}
          onSetAvailable={handleSetAvailable}
        />
      </View>
    ),
    [
      handleOpenDetail,
      handleEditCharger,
      handleDeletePrompt,
      handleToggleBusy,
      handleSetAvailable,
    ],
  );

  if (!session) return <View />;

  return (
    <Screen scroll edges={['top']} contentStyle={styles.scroll}>
      <ProfileHeader user={session.user} />

      {showStats ? (
        <ProfileStats
          rating={rating}
          reviewCount={reviewCount}
          chargerCount={chargers.length}
        />
      ) : null}

      {/* Mis cargadores — moved from the old Home tab. */}
      <View style={styles.chargersSection}>
        <View style={styles.chargersHeaderRow}>
          <Text
            style={[
              theme.typography.h3,
              { color: theme.colors.text, flex: 1 },
            ]}
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
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Plus color={theme.colors.textOnPrimary} size={16} />
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

        {chargers.length === 0 ? (
          <View style={styles.chargersEmpty}>
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.textMuted, textAlign: 'center' },
              ]}
            >
              Todavía no publicaste ningún cargador. Tocá "Publicar nuevo"
              para empezar.
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.textMuted, marginBottom: 12 },
              ]}
            >
              {`${chargers.length} ${chargers.length === 1 ? 'cargador publicado' : 'cargadores publicados'}`}
            </Text>
            <FlatList
              data={chargers}
              keyExtractor={(c) => c.id}
              renderItem={renderChargerItem}
              scrollEnabled={false}
            />
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          label="Editar perfil"
          variant="primary"
          size="lg"
          fullWidth
          onPress={onEdit}
          leftIcon={
            <ScrollText color={theme.colors.textOnPrimary} size={18} />
          }
        />
        <Button
          label="Ver mi perfil público"
          variant="secondary"
          size="md"
          fullWidth
          onPress={onViewPublic}
          leftIcon={<Share2 color={theme.colors.text} size={18} />}
          style={styles.viewPublic}
        />
      </View>

      <Text style={[theme.typography.h3, styles.sectionTitle]}>
        Preferencias
      </Text>
      <Card variant="elevated" padded={false}>
        <CardBody>
          <ProfileMenuItem
            icon={Bell}
            label="Notificaciones"
            onPress={() => onStubPress('Notificaciones')}
          />
          <Divider />
          <ProfileMenuItem
            icon={CreditCard}
            label="Métodos de pago"
            onPress={() => onStubPress('Métodos de pago')}
          />
          <Divider />
          <ProfileMenuItem
            icon={HelpCircle}
            label="Ayuda y soporte"
            onPress={() => onStubPress('Ayuda y soporte')}
          />
          <Divider />
          <ProfileMenuItem
            icon={Lock}
            label="Política de privacidad"
            onPress={() => onStubPress('Política de privacidad')}
          />
          <Divider />
          <ProfileMenuItem
            icon={ScrollText}
            label="Términos y condiciones"
            onPress={() => onStubPress('Términos y condiciones')}
          />
        </CardBody>
      </Card>

      <View style={styles.logoutWrap}>
        <Button
          label="Cerrar sesión"
          variant="secondary"
          size="md"
          fullWidth
          leftIcon={<LogOut color={theme.colors.danger} size={18} />}
          onPress={onLogout}
          style={styles.logoutButton}
        />
      </View>

      <DeleteConfirmModal
        visible={!!pendingDelete}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
      <AlertModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        variant={alertConfig.variant}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  unauth: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  unauthCta: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
  actions: {
    gap: 8,
  },
  viewPublic: {},
  sectionTitle: {
    color: '#0F172A',
    marginTop: 4,
  },
  logoutWrap: {
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  chargersSection: {},
  chargersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chargersEmpty: {
    paddingVertical: 16,
  },
  chargerItem: {
    marginBottom: 12,
  },
});

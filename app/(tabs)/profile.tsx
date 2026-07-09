/**
 * Profile tab.
 *
 * Two modes driven by the auth status:
 *   - unauthenticated: welcoming copy + "Iniciá sesión" CTA.
 *   - authenticated: full profile screen — header, stats (if host),
 *     "Editar perfil" / "Cerrar sesión" action buttons, and a
 *     "Preferencias" menu with 5 stub items.
 *
 * Stub menu items fire an `Alert.alert("Próximamente", …)` and disappear
 * once Phase 9 wires up real notification settings, payment methods, etc.
 */
import React, { useCallback, useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  CreditCard,
  HelpCircle,
  Lock,
  LogOut,
  ScrollText,
  Share2,
} from 'lucide-react-native';

import {
  Avatar,
  Button,
  Card,
  CardBody,
  Divider,
  Screen,
} from '@/components/ui';
import {
  ProfileHeader,
  ProfileMenuItem,
  ProfileStats,
} from '@/components/profile';
import { useAuth } from '@/features/auth';
import { useMyChargers } from '@/data/chargerStore';
import { useTheme } from '@/theme';

export default function ProfileScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { status, session, signOut } = useAuth();

  const handleLogin = useCallback((): void => {
    router.push('/(public)/login');
  }, [router]);

  const handleEdit = useCallback((): void => {
    router.push('/profile/edit');
  }, [router]);

  const handleViewPublicProfile = useCallback((): void => {
    if (session?.user.id) {
      router.push(`/profile/${session.user.id}`);
    }
  }, [router, session?.user.id]);

  const handleLogout = useCallback((): void => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que querés salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(public)/welcome');
          },
        },
      ],
    );
  }, [router, signOut]);

  const handleStub = useCallback((label: string) => {
    Alert.alert(
      'Próximamente',
      `${label} llega en una próxima versión.`,
    );
  }, []);

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
      </Screen>
    );
  }

  return (
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
  );
}

// ---------------------------------------------------------------------------
// Authenticated body — kept as a separate component so the main
// `ProfileScreen` reads top-to-bottom and so the unauthenticated branch
// short-circuits cleanly.
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
  const { session } = useAuth();
  const chargers = useMyChargers(userId);

  // The current user is always a "host" if they have at least one charger,
  // even if their account wasn't created with the isHost flag set.
  const showStats = useMemo(
    () => isHost || chargers.length > 0,
    [isHost, chargers.length],
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
});

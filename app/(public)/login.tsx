/**
 * Login screen.
 *
 * Renders the auth header, an email + password form (validated by Zod via
 * react-hook-form), a "Olvidé mi contraseña" link (visual only for v1),
 * mocked social buttons, and a "Crear cuenta" link to the register screen.
 *
 * On submit, delegates to `useAuth().signIn`, which validates again on
 * the JS side as a defense in depth and persists the resulting session.
 */
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StatusBar } from 'expo-status-bar';

import {
  AuthHeader,
  PasswordInput,
  SocialAuthButtons,
} from '@/components/auth';
import { Button, Divider, TextField } from '@/components/ui';
import {
  useAuth,
  type LoginInput,
  loginSchema,
} from '@/features/auth';
import { useTheme } from '@/theme';

export default function LoginScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = useCallback(
    handleSubmit(async (data) => {
      setSubmitting(true);
      setFormError(null);
      try {
        await signIn(data);
        router.replace('/(tabs)');
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No pudimos iniciar sesión. Probá de nuevo.';
        setFormError(message);
      } finally {
        setSubmitting(false);
      }
    }),
    [handleSubmit, router, signIn],
  );

  const handleForgotPassword = useCallback((): void => {
    Alert.alert(
      'Próximamente',
      'La recuperación de contraseña llega en una próxima versión.',
    );
  }, []);

  const isSubmitDisabled = submitting || !formState.isValid;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="Bienvenido de vuelta" />

        {formError ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: '#FEE2E2',
                borderColor: theme.colors.danger,
              },
            ]}
            accessibilityRole="alert"
          >
            <Text
              style={[
                theme.typography.small,
                { color: theme.colors.danger },
              ]}
            >
              {formError}
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <EmailField control={control} />
          <PasswordField
            control={control}
            onSubmit={() => {
              if (!isSubmitDisabled) void onSubmit();
            }}
          />

          <View style={styles.forgotRow}>
            <Pressable
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Olvidé mi contraseña"
              onPress={handleForgotPassword}
            >
              <Text
                style={[
                  theme.typography.smallBold,
                  { color: theme.colors.primary },
                ]}
              >
                Olvidé mi contraseña
              </Text>
            </Pressable>
          </View>

          <Button
            label="Iniciar sesión"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={isSubmitDisabled}
            onPress={() => void onSubmit()}
          />
        </View>

        <View>
          <Divider label="o continuá con" />
        </View>

        <SocialAuthButtons />

        <View style={styles.footer}>
          <Text
            style={[
              theme.typography.small,
              { color: theme.colors.textMuted },
            ]}
          >
            ¿No tenés cuenta?
          </Text>
          <Pressable
            onPress={() => router.push('/(public)/register')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Crear cuenta"
          >
            <Text
              style={[
                theme.typography.smallBold,
                { color: theme.colors.primary },
              ]}
            >
              Crear cuenta
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Form-field wrappers (kept local so the main component stays readable).
// ---------------------------------------------------------------------------

interface FieldProps {
  control: ReturnType<typeof useForm<LoginInput>>['control'];
}

function EmailField({ control }: FieldProps): React.JSX.Element {
  const { field, fieldState } = useController({
    control,
    name: 'email',
  });
  return (
    <TextField
      label="Email"
      value={field.value}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      placeholder="tu@email.com"
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="email"
      error={fieldState.error?.message}
      returnKeyType="next"
    />
  );
}

interface PasswordFieldProps extends FieldProps {
  onSubmit: () => void;
}

function PasswordField({
  control,
  onSubmit,
}: PasswordFieldProps): React.JSX.Element {
  const { field, fieldState } = useController({
    control,
    name: 'password',
  });
  return (
    <PasswordInput
      value={field.value}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      placeholder="Contraseña"
      error={fieldState.error?.message}
      autoComplete="current-password"
      returnKeyType="go"
      onSubmitEditing={onSubmit}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    gap: 24,
  },
  errorBanner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  form: { gap: 16 },
  forgotRow: { alignItems: 'flex-end' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});

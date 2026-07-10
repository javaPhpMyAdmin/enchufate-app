/**
 * Register screen.
 *
 * Captures name, surname, email, phone (with the "+54 " country prefix
 * applied as a non-removable adornment), city, password, and a password
 * confirmation. Validation is driven by `registerSchema` (see
 * `@/features/auth/schemas`).
 *
 * On success, `useAuth().signUp` creates the Supabase user (passing
 * `display_name` / `surname` / `avatar_url` in `options.data` so the
 * `handle_new_user` trigger creates the matching `profiles` row), the
 * auth state change listener picks the session up, and the app routes
 * over to the (tabs) experience — or the `?redirect=` target if the
 * user came in from the publish auth gate.
 *
 * Note: with default Supabase settings, the signup returns
 * `session: null` until the user confirms their email. For v1 we
 * require the dashboard to be set to "Confirm email: disabled" so the
 * session is established immediately and the redirect happens in one
 * step. If the dashboard still has email confirmation on, the user
 * would need to confirm before they can sign in.
 */
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  mapSupabaseError,
  useAuth,
  type RegisterInput,
  registerSchema,
} from '@/features/auth';
import { useTheme } from '@/theme';

const PHONE_PREFIX = '+54 ';

export default function RegisterScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { signUp } = useAuth();
  const params = useLocalSearchParams<{ redirect?: string | string[] }>();
  const redirectTo = Array.isArray(params.redirect)
    ? params.redirect[0]
    : params.redirect;
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      surname: '',
      email: '',
      phone: '',
      city: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = useCallback(
    handleSubmit(async (data) => {
      setSubmitting(true);
      setFormError(null);
      try {
        await signUp(data);
        const fallback = '/(tabs)';
        const target =
          redirectTo && redirectTo.startsWith('/') ? redirectTo : fallback;
        router.replace(target as never);
      } catch (err) {
        const raw =
          err instanceof Error
            ? err.message
            : 'No pudimos crear tu cuenta. Probá de nuevo.';
        setFormError(mapSupabaseError(raw));
      } finally {
        setSubmitting(false);
      }
    }),
    [handleSubmit, redirectTo, router, signUp],
  );

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
        <AuthHeader title="Creá tu cuenta" />

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
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                control={control}
                name="name"
                label="Nombre"
                placeholder="Sofía"
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
            <View style={styles.half}>
              <Field
                control={control}
                name="surname"
                label="Apellido"
                placeholder="Méndez"
                autoCapitalize="words"
              />
            </View>
          </View>

          <Field
            control={control}
            name="email"
            label="Email"
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />

          <Field
            control={control}
            name="phone"
            label="Teléfono"
            placeholder="11 5555 5555"
            keyboardType="phone-pad"
            autoComplete="tel"
            leftAdornment={
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.textMuted },
                ]}
              >
                {PHONE_PREFIX}
              </Text>
            }
          />

          <Field
            control={control}
            name="city"
            label="Ciudad"
            placeholder="Buenos Aires"
            autoCapitalize="words"
          />

          <PasswordField
            control={control}
            name="password"
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            returnKeyType="next"
          />

          <PasswordField
            control={control}
            name="confirmPassword"
            label="Repetir contraseña"
            placeholder="Volvé a escribir tu contraseña"
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={() => {
              if (!isSubmitDisabled) void onSubmit();
            }}
          />

          <Button
            label="Crear cuenta"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={isSubmitDisabled}
            onPress={() => void onSubmit()}
          />
        </View>

        <View>
          <Divider label="o registrate con" />
        </View>

        <SocialAuthButtons />

        <View style={styles.footer}>
          <Text
            style={[
              theme.typography.small,
              { color: theme.colors.textMuted },
            ]}
          >
            ¿Ya tenés cuenta?
          </Text>
          <Pressable
            onPress={() => router.push('/(public)/login')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Ya tengo cuenta"
          >
            <Text
              style={[
                theme.typography.smallBold,
                { color: theme.colors.primary },
              ]}
            >
              Ya tengo cuenta
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Generic field wrapper around `useController` + `TextField`.
// ---------------------------------------------------------------------------

interface FieldProps {
  control: ReturnType<typeof useForm<RegisterInput>>['control'];
  name: keyof RegisterInput;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoComplete?: 'email' | 'tel' | 'name' | 'off';
  leftAdornment?: React.ReactNode;
}

function Field({
  control,
  name,
  label,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  autoComplete = 'off',
  leftAdornment,
}: FieldProps): React.JSX.Element {
  const { field, fieldState } = useController({ control, name });
  return (
    <TextField
      label={label}
      value={(field.value as string) ?? ''}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      placeholder={placeholder}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      autoComplete={autoComplete}
      leftAdornment={leftAdornment}
      error={fieldState.error?.message}
    />
  );
}

interface PasswordFieldProps {
  control: ReturnType<typeof useForm<RegisterInput>>['control'];
  name: 'password' | 'confirmPassword';
  label: string;
  placeholder: string;
  autoComplete: 'current-password' | 'new-password';
  returnKeyType: 'next' | 'go' | 'done' | 'send';
  onSubmitEditing?: () => void;
}

function PasswordField({
  control,
  name,
  label,
  placeholder,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
}: PasswordFieldProps): React.JSX.Element {
  const { field, fieldState } = useController({ control, name });
  const theme = useTheme();
  return (
    <View>
      <Text
        style={[
          theme.typography.smallBold,
          { color: theme.colors.text, marginBottom: 6 },
        ]}
      >
        {label}
      </Text>
      <PasswordInput
        value={field.value}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
        error={fieldState.error?.message}
        autoComplete={autoComplete}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
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
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});

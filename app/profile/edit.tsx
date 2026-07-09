/**
 * Edit profile screen — RHF + Zod form for the authenticated user.
 *
 * Layout (top to bottom):
 *   1. Cancel button (top-left, owned by the route's `headerLeft`)
 *   2. AvatarPicker (centered)
 *   3. TextField: name
 *   4. TextField: surname
 *   5. TextField: email
 *   6. TextField: phone (with +54 prefix visual hint)
 *   7. TextField: city
 *   8. TextField: bio (only if isHost)
 *   9. Submit button: "Guardar cambios"
 *
 * On submit we:
 *   - call `updateProfile(patch)` from AuthProvider
 *   - navigate back via `router.back()`
 *
 * The form re-validates on each submit. Submit is disabled while a save
 * is in flight (visual only; the operation is fast in the mock layer).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { AvatarPicker } from '@/components/profile';
import { Avatar, Screen, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  editProfileSchema,
  type EditProfileInput,
} from '@/features/profile';
import { useTheme } from '@/theme';

export default function EditProfileScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { session, updateProfile } = useAuth();

  const current = session?.user;

  const defaultValues = useMemo<EditProfileInput>(
    () => ({
      name: current?.name ?? '',
      surname: current?.surname ?? '',
      email: current?.email ?? '',
      phone: current?.phone ?? '',
      city: current?.city ?? '',
      bio: current?.bio ?? '',
      avatarUrl: current?.avatarUrl ?? '',
    }),
    [current],
  );

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const watchedAvatar = watch('avatarUrl');
  const watchedName = watch('name');
  const watchedSurname = watch('surname');

  const [saving, setSaving] = useState<boolean>(false);

  const handleCancel = useCallback((): void => {
    router.back();
  }, [router]);

  const handleAvatarChange = useCallback(
    (url: string) => {
      setValue('avatarUrl', url, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    try {
      await updateProfile({
        name: values.name.trim(),
        surname: values.surname.trim(),
        email: values.email.trim(),
        phone: values.phone ? values.phone : undefined,
        city: values.city ? values.city : undefined,
        bio: current?.isHost && values.bio ? values.bio : undefined,
        avatarUrl: values.avatarUrl,
      });
      router.back();
    } catch (err) {
      console.warn('[profile-edit] update failed', err);
    } finally {
      setSaving(false);
    }
  });

  if (!current) {
    // Defensive: the AuthProvider should keep this screen unrenderable
    // for unauth users, but the typescript narrowing of `current` is
    // still helpful here.
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={{ color: theme.colors.textMuted }}>
            No hay sesión activa.
          </Text>
        </View>
      </Screen>
    );
  }

  const isHost = current.isHost;
  const busy = isSubmitting || saving;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Editar perfil',
          headerLeft: () => (
            <Pressable
              onPress={handleCancel}
              hitSlop={8}
              accessibilityLabel="Cancelar edición"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cancelBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <X color={theme.colors.text} size={20} />
              <Text
                style={[
                  theme.typography.smallBold,
                  { color: theme.colors.text, marginLeft: 4 },
                ]}
              >
                Cancelar
              </Text>
            </Pressable>
          ),
        }}
      />
      <Screen scroll edges={['bottom']} contentStyle={styles.scroll}>
        <View style={styles.avatarPreview}>
          <PreviewAvatar
            name={`${watchedName} ${watchedSurname}`}
            url={watchedAvatar}
          />
        </View>

        <View style={styles.pickerWrap}>
          <Text style={[theme.typography.smallBold, styles.section]}>
            Elegí tu avatar
          </Text>
          <AvatarPicker value={watchedAvatar} onChange={handleAvatarChange} />
        </View>

        <View style={styles.fields}>
          <Text style={[theme.typography.smallBold, styles.section]}>
            Datos personales
          </Text>
          <TextField
            label="Nombre"
            value={watch('name')}
            onChangeText={(v) => setValue('name', v, { shouldValidate: true })}
            error={errors.name?.message}
            autoCapitalize="words"
            autoComplete="name"
          />
          <TextField
            label="Apellido"
            value={watch('surname')}
            onChangeText={(v) =>
              setValue('surname', v, { shouldValidate: true })
            }
            error={errors.surname?.message}
            autoCapitalize="words"
            autoComplete="name"
          />
          <TextField
            label="Email"
            value={watch('email')}
            onChangeText={(v) =>
              setValue('email', v, { shouldValidate: true })
            }
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextField
            label="Teléfono"
            value={watch('phone') ?? ''}
            onChangeText={(v) =>
              setValue('phone', v, { shouldValidate: true })
            }
            error={errors.phone?.message}
            helper="Opcional. Sin prefijo, solo dígitos."
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <TextField
            label="Ciudad"
            value={watch('city') ?? ''}
            onChangeText={(v) =>
              setValue('city', v, { shouldValidate: true })
            }
            error={errors.city?.message}
            autoCapitalize="words"
          />

          {isHost ? (
            <TextField
              label="Bio"
              value={watch('bio') ?? ''}
              onChangeText={(v) =>
                setValue('bio', v, { shouldValidate: true })
              }
              error={errors.bio?.message}
              helper="Máx. 200 caracteres. Solo se muestra en tu perfil público."
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          ) : null}
        </View>

        <Pressable
          onPress={busy ? undefined : () => void onSubmit()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Guardar cambios"
          style={({ pressed }) => [
            styles.submit,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.lg,
              opacity: busy ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text
              style={[
                theme.typography.bodyBold,
                { color: theme.colors.textOnPrimary },
              ]}
            >
              Guardar cambios
            </Text>
          )}
        </Pressable>
      </Screen>
    </>
  );
}

function PreviewAvatar({
  name,
  url,
}: {
  name: string;
  url: string;
}): React.JSX.Element {
  if (url) {
    return <Avatar source={url} name={name} size="xl" />;
  }
  return <PreviewInitials name={name} />;
}

function PreviewInitials({ name }: { name: string }): React.JSX.Element {
  const theme = useTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
  return (
    <View
      style={{
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={[
          theme.typography.h2,
          { color: theme.colors.text, fontSize: 28 },
        ]}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  avatarPreview: {
    alignItems: 'center',
  },
  pickerWrap: {
    gap: 8,
  },
  section: {
    color: '#0F172A',
  },
  fields: {
    gap: 14,
  },
  submit: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});

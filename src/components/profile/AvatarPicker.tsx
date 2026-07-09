/**
 * AvatarPicker — 4-column grid of 8 preset avatars.
 *
 * For v1 we don't ship a real image picker (Phase 9). The user picks one
 * of 8 visually distinct ui-avatars.com URLs. The currently-selected
 * avatar gets a 3px primary-color border ring.
 *
 * The picker is purely controlled: the parent owns `value` and the
 * `onChange` callback. The default `seeds` come from
 * `@/features/profile/helpers` but callers can override them when they
 * want a different visual set.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui';
import { AVATAR_PRESETS, buildAvatarUrl } from '@/features/profile/helpers';
import { useTheme } from '@/theme';

const COLUMNS = 4;
const AVATAR_SIZE = 64;

export interface AvatarPickerProps {
  /** Currently selected avatar URL. */
  value: string;
  /** Fires when the user taps an avatar. */
  onChange: (url: string) => void;
  /**
   * Optional list of name pairs to render. Defaults to the 8
   * `AVATAR_PRESETS` exposed by `@/features/profile`.
   */
  seeds?: ReadonlyArray<{ name: string; surname: string }>;
}

export function AvatarPicker({
  value,
  onChange,
  seeds = AVATAR_PRESETS,
}: AvatarPickerProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {seeds.map((seed) => (
        <AvatarCell
          key={`${seed.name}-${seed.surname}`}
          url={buildAvatarUrl(seed.name, seed.surname)}
          selected={buildAvatarUrl(seed.name, seed.surname) === value}
          onSelect={onChange}
          borderColor={theme.colors.primary}
        />
      ))}
    </View>
  );
}

interface AvatarCellProps {
  url: string;
  selected: boolean;
  onSelect: (url: string) => void;
  borderColor: string;
}

function AvatarCell({
  url,
  selected,
  onSelect,
  borderColor,
}: AvatarCellProps): React.JSX.Element {
  const handlePress = useCallback(() => onSelect(url), [onSelect, url]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Cambiar avatar"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.cell,
        {
          borderColor: selected ? borderColor : 'transparent',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Avatar source={url} name="avatar" size="lg" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 12,
    columnGap: 12,
  },
  cell: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

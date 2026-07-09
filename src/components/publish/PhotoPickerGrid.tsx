/**
 * PhotoPickerGrid — 3-column grid of placeholder charger photos.
 *
 * For v1 the pool is fixed (`src/data/photos.ts`). Users tap a tile to
 * toggle selection; the check overlay and primary border signal the
 * current choice. A header above the grid reminds the user of the cap
 * ("Elegí hasta N fotos").
 */
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { CHARGER_PHOTO_POOL } from '@/data/photos';
import { useTheme } from '@/theme';

export interface PhotoPickerGridProps {
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

export function PhotoPickerGrid({
  selected,
  onChange,
  max = 5,
}: PhotoPickerGridProps): React.JSX.Element {
  const theme = useTheme();

  const isSelected = (url: string): boolean => selected.includes(url);

  const toggle = (url: string): void => {
    if (isSelected(url)) {
      onChange(selected.filter((u) => u !== url));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, url]);
  };

  return (
    <View>
      <Text
        style={[
          theme.typography.smallBold,
          { color: theme.colors.text, marginBottom: 8 },
        ]}
      >
        {`Elegí hasta ${max} fotos`}
      </Text>
      <View style={styles.grid}>
        {CHARGER_PHOTO_POOL.map((url) => {
          const active = isSelected(url);
          const disabled = !active && selected.length >= max;
          return (
            <Pressable
              key={url}
              onPress={() => toggle(url)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active, disabled }}
              accessibilityLabel={`Foto ${url}`}
              disabled={disabled}
              style={({ pressed }) => [
                styles.tile,
                {
                  borderColor: active
                    ? theme.colors.primary
                    : theme.colors.border,
                  borderWidth: active ? 2 : 1,
                  borderRadius: theme.radii.md,
                  opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Image
                source={{ uri: url }}
                style={styles.image}
                resizeMode="cover"
              />
              {active ? (
                <View
                  style={[
                    styles.checkBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Check color={theme.colors.textOnPrimary} size={14} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Text
        style={[
          theme.typography.caption,
          { color: theme.colors.textMuted, marginTop: 8 },
        ]}
      >
        {`${selected.length} de ${max} seleccionadas`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '31.5%',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * PhotoPickerGrid — gallery picker for charger photos.
 *
 * Displays a grid of selected photo thumbnails (local URIs from the
 * device gallery) with a "+" button to open expo-image-picker. Each
 * thumbnail has an "X" badge to remove it. Max 5 photos.
 */
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Plus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

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
  const remaining = max - selected.length;

  const pickImages = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      onChange([...selected, ...newUris].slice(0, max));
    }
  };

  const remove = (uri: string): void => {
    onChange(selected.filter((u) => u !== uri));
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
        {selected.map((uri) => (
          <Pressable
            key={uri}
            onPress={() => remove(uri)}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar foto`}
            style={({ pressed }) => [
              styles.tile,
              {
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.radii.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="cover"
            />
            <View
              style={[
                styles.removeBadge,
                { backgroundColor: theme.colors.danger ?? '#EF4444' },
              ]}
            >
              <X color="#FFFFFF" size={12} />
            </View>
          </Pressable>
        ))}

        {remaining > 0 ? (
          <Pressable
            onPress={pickImages}
            accessibilityRole="button"
            accessibilityLabel={`Agregar foto (${remaining} restantes)`}
            style={({ pressed }) => [
              styles.tile,
              styles.addButton,
              {
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderRadius: theme.radii.md,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Plus color={theme.colors.textMuted} size={28} />
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textMuted, marginTop: 4 },
              ]}
            >
              Agregar
            </Text>
          </Pressable>
        ) : null}
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
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

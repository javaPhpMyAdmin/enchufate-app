import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Button, Divider } from '@/components/ui';
import type {
  ChargerFilters,
  ChargerStatus,
  ConnectorType,
} from '@/data/types';
import { CONNECTOR_LABELS, DEFAULT_FILTERS, STATUS_LABELS } from '@/data/types';
import { useTheme } from '@/theme';

export interface FiltersSheetHandle {
  open: (currentFilters: ChargerFilters) => void;
  close: () => void;
}

export interface FiltersSheetProps {
  onApply: (filters: ChargerFilters) => void;
  onReset: () => void;
}

const SNAP_POINTS = ['55%', '92%'];

const POWER_BUCKETS: Array<{ label: string; range: [number, number] }> = [
  { label: 'Hasta 7 kW', range: [0, 7] },
  { label: '7–11 kW', range: [7, 11] },
  { label: '11–22 kW', range: [11, 22] },
  { label: '22+ kW', range: [22, 50] },
];

const PRICE_BUCKETS: Array<{ label: string; range: [number, number] }> = [
  { label: 'Hasta 5 USD', range: [0, 5] },
  { label: '5–8 USD', range: [5, 8] },
  { label: '8–12 USD', range: [8, 12] },
  { label: '12+ USD', range: [12, 50] },
];

const DISTANCE_BUCKETS: Array<{ label: string; km: number }> = [
  { label: '1 km', km: 1 },
  { label: '5 km', km: 5 },
  { label: '10 km', km: 10 },
  { label: '25 km', km: 25 },
];

const STATUSES: ChargerStatus[] = ['available', 'reserved', 'busy'];
const CONNECTORS: ConnectorType[] = ['type1', 'type2', 'ccs', 'chademo', 'tesla'];

export const FiltersSheet = forwardRef<FiltersSheetHandle, FiltersSheetProps>(
  function FiltersSheet({ onApply, onReset }, ref) {
    const theme = useTheme();
    const sheetRef = useRef<BottomSheet | null>(null);

    const [draft, setDraft] = useState<ChargerFilters>(DEFAULT_FILTERS);

    useImperativeHandle(
      ref,
      () => ({
        open: (current) => {
          setDraft(current);
          sheetRef.current?.snapToIndex(0);
        },
        close: () => {
          sheetRef.current?.close();
        },
      }),
      [],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
          pressBehavior="close"
        />
      ),
      [],
    );

    const toggleStatus = (s: ChargerStatus) => {
      setDraft((d) => ({
        ...d,
        status: d.status.includes(s)
          ? d.status.filter((x) => x !== s)
          : [...d.status, s],
      }));
    };

    const toggleConnector = (c: ConnectorType) => {
      setDraft((d) => ({
        ...d,
        connectorTypes: d.connectorTypes.includes(c)
          ? d.connectorTypes.filter((x) => x !== c)
          : [...d.connectorTypes, c],
      }));
    };

    const setPower = (range: [number, number]) => {
      setDraft((d) => ({ ...d, powerRange: range }));
    };

    const setPrice = (range: [number, number]) => {
      setDraft((d) => ({ ...d, priceRange: range }));
    };

    const setDistance = (km: number | undefined) => {
      setDraft((d) => ({ ...d, maxDistanceKm: km }));
    };

    const handleApply = () => {
      onApply(draft);
      sheetRef.current?.close();
    };

    const handleReset = () => {
      const fresh = DEFAULT_FILTERS;
      setDraft(fresh);
      onReset();
    };

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.borderStrong,
          width: 40,
        }}
        backgroundStyle={{ backgroundColor: theme.colors.background }}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[theme.typography.h3, { color: theme.colors.text }]}>
            Filtros
          </Text>

          <Section title="Estado">
            <ChipRow>
              {STATUSES.map((s) => (
                <Chip
                  key={s}
                  label={STATUS_LABELS[s]}
                  selected={draft.status.includes(s)}
                  onPress={() => toggleStatus(s)}
                />
              ))}
            </ChipRow>
          </Section>

          <Section title="Conector">
            <ChipRow>
              {CONNECTORS.map((c) => (
                <Chip
                  key={c}
                  label={CONNECTOR_LABELS[c]}
                  selected={draft.connectorTypes.includes(c)}
                  onPress={() => toggleConnector(c)}
                />
              ))}
            </ChipRow>
          </Section>

          <Section title="Potencia">
            <ChipRow>
              {POWER_BUCKETS.map((b) => (
                <Chip
                  key={b.label}
                  label={b.label}
                  selected={
                    draft.powerRange[0] === b.range[0] &&
                    draft.powerRange[1] === b.range[1]
                  }
                  onPress={() => setPower(b.range)}
                />
              ))}
            </ChipRow>
          </Section>

          <Section title="Precio por hora">
            <ChipRow>
              {PRICE_BUCKETS.map((b) => (
                <Chip
                  key={b.label}
                  label={b.label}
                  selected={
                    draft.priceRange[0] === b.range[0] &&
                    draft.priceRange[1] === b.range[1]
                  }
                  onPress={() => setPrice(b.range)}
                />
              ))}
            </ChipRow>
          </Section>

          <Section title="Distancia">
            <ChipRow>
              <Chip
                label="Sin límite"
                selected={draft.maxDistanceKm === undefined}
                onPress={() => setDistance(undefined)}
              />
              {DISTANCE_BUCKETS.map((b) => (
                <Chip
                  key={b.km}
                  label={b.label}
                  selected={draft.maxDistanceKm === b.km}
                  onPress={() => setDistance(b.km)}
                />
              ))}
            </ChipRow>
          </Section>

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.footer}>
            <Button
              label="Reset"
              variant="ghost"
              onPress={handleReset}
              style={{ flex: 1 }}
            />
            <Button
              label="Aplicar"
              variant="primary"
              onPress={handleApply}
              style={{ flex: 2 }}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 16 }}>
      <Text
        style={[
          theme.typography.smallBold,
          { color: theme.colors.textMuted, marginBottom: 8 },
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <View style={styles.chipRow}>{children}</View>;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[
          theme.typography.caption,
          {
            color: selected ? theme.colors.textOnPrimary : theme.colors.text,
            fontWeight: '600',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
  },
});

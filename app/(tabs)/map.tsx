import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { ChargerCard } from '@/components/charger';
import { AlertModal } from '@/components/ui';
import {
  ChargerDetailSheet,
  type ChargerDetailSheetHandle,
} from '@/components/sheets';
import {
  FiltersSheet,
  type FiltersSheetHandle,
} from '@/components/sheets';
import {
  ChargerLoadingOverlay,
  ChargerMap,
  MapControls,
  type ChargerMapHandle,
  type MapViewMode,
} from '@/components/map';
import { useAuth } from '@/features/auth';
import { useChargersQuery } from '@/hooks/useChargersQuery';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { DEFAULT_FILTERS, type Charger, type ChargerFilters, type LatLng, type User } from '@/data/types';
import { genericUser } from '@/data/userStub';
import { applyFilters } from '@/domain/charger';
import { haversineKm } from '@/lib/distance';
import { useTheme } from '@/theme';

export default function MapScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { select: selectChargerId } = useLocalSearchParams<{ select?: string }>();
  const { session } = useAuth();
  const mapRef = useRef<ChargerMapHandle | null>(null);
  const detailSheetRef = useRef<ChargerDetailSheetHandle | null>(null);
  const filtersSheetRef = useRef<FiltersSheetHandle | null>(null);

  const [viewMode, setViewMode] = useState<MapViewMode>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTick, setSelectedTick] = useState(0); // forces re-fire on same charger tap
  const [filters, setFilters] = useState<ChargerFilters>(DEFAULT_FILTERS);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [loginAlertVisible, setLoginAlertVisible] = useState(false);

  // Auto-select a charger when navigated from profile (?select=<id>).
  // We intentionally do NOT call handleOpenDetail here — it closes over
  // visibleChargers/allChargers which may be empty on first render,
  // causing a stale-closure miss. Instead we just set the selected state;
  // the useEffect below will open the sheet once data is available.
  useEffect(() => {
    if (selectChargerId) {
      setSelectedId(selectChargerId);
      setSelectedTick((t) => t + 1);
    }
  }, [selectChargerId]);

  // Request location permission once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } catch (err) {
        console.warn('[map] failed to acquire location', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // As soon as we have a user location, pan the map to it and zoom in so
  // the surrounding area (not a continent-wide view) is what the user sees
  // first. We defer one frame so the map ref is guaranteed to be set even
  // if the location arrives on the very first render.
  useEffect(() => {
    if (!userLocation) return;
    const id = requestAnimationFrame(() => {
      // `animateTo(coords, zoomDelta)` adds `zoomDelta` to the base zoom
      // of 15 — `0` lands at a comfortable neighborhood view, closer than
      // the initial region (0.08 deg ≈ 8 km wide).
      mapRef.current?.animateTo(userLocation, 0);
    });
    return () => cancelAnimationFrame(id);
  }, [userLocation]);

  // The store is the single source of truth. Subscribing here means
  // newly published chargers appear on the map without a refresh.
  // Use the query hook directly to avoid a double subscription
  // (useChargers() already wraps useChargersQuery() internally).
  const { data: allChargers = [], isLoading: chargersLoading } = useChargersQuery();

  // Apply filters only (no text search — map is for quick browsing).
  const visibleChargers = useMemo<Charger[]>(() => {
    return applyFilters(allChargers, filters, userLocation);
  }, [allChargers, filters, userLocation]);

  // Detect if user has applied non-default filters (for the pill badge).
  const hasActiveFilters = useMemo(() => {
    const d = DEFAULT_FILTERS;
    return (
      filters.status.length !== d.status.length ||
      filters.connectorTypes.length !== d.connectorTypes.length ||
      filters.powerRange[0] !== d.powerRange[0] ||
      filters.powerRange[1] !== d.powerRange[1] ||
      filters.priceRange[0] !== d.priceRange[0] ||
      filters.priceRange[1] !== d.priceRange[1] ||
      filters.maxDistanceKm !== d.maxDistanceKm
    );
  }, [filters]);

  const selectedCharger = useMemo<Charger | null>(() => {
    if (!selectedId) return null;
    return visibleChargers.find((c) => c.id === selectedId) ??
      allChargers.find((c) => c.id === selectedId) ??
      null;
  }, [selectedId, visibleChargers, allChargers]);

  // Resolve the real owner from Supabase when a charger is selected.
  const { data: selectedOwner } = useProfileQuery(selectedCharger?.ownerId);

  // Imperatively show the sheet on every tap. Uses a stub owner so the
  // sheet opens instantly with a skeleton; the useEffect below updates it
  // when the real owner resolves from Supabase.
  const handleOpenDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSelectedTick((t) => t + 1); // always increments, even for same charger
      // Find the charger from the current data (synchronous — it's in memory).
      const c =
        visibleChargers.find((ch) => ch.id === id) ??
        allChargers.find((ch) => ch.id === id);
      if (!c) return;
      detailSheetRef.current?.show(c, genericUser(c.ownerId), true);
    },
    [visibleChargers, allChargers],
  );

  // When the real owner data arrives, update the sheet. selectedTick
  // ensures this fires even when tapping the same charger again (cached
  // owner has the same reference, but the tick always changes).
  useEffect(() => {
    if (!selectedCharger) return;
    if (selectedOwner) {
      detailSheetRef.current?.show(selectedCharger, selectedOwner, false);
    } else {
      // Owner still loading — show skeleton so the user gets instant feedback.
      detailSheetRef.current?.show(selectedCharger, genericUser(selectedCharger.ownerId), true);
    }
  }, [selectedCharger, selectedOwner, selectedTick]);

  const handleMyLocation = useCallback(() => {
    if (!userLocation) return;
    mapRef.current?.animateTo(userLocation, 1);
  }, [userLocation]);

  const handleToggleView = () => {
    setViewMode((m: MapViewMode) => (m === 'map' ? 'list' : 'map'));
  };

  const handleOpenFilters = () => {
    filtersSheetRef.current?.open(filters);
  };

  const handleApplyFilters = (next: ChargerFilters) => {
    setFilters(next);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Phase 5 (T-20): "Contactar" in the bottom sheet navigates to the
  // chat screen with the owner's id. The conversation is NOT created yet —
  // it will only be created when the user actually sends a message.
  const handleContact = useCallback(
    (ownerId: string) => {
      const me = session?.user;
      if (!me) {
        setLoginAlertVisible(true);
        return;
      }
      if (me.id === ownerId) return; // can't message yourself
      router.push({ pathname: '/messages/chat', params: { ownerId } });
    },
    [session?.user, router],
  );

  // Phase 4 (T-19): "Ver perfil" in the bottom sheet navigates to the
  // public owner profile. The sheet's own "Ver perfil" button already
  // closes the sheet via `onClose`, so we just need to trigger the
  // navigation here.
  const handleViewProfile = useCallback(
    (ownerId: string) => {
      router.push(`/profile/${ownerId}`);
    },
    [router],
  );

  const handleReview = useCallback(
    (ownerId: string, chargerId: string) => {
      router.push({
        pathname: '/reviews/write',
        params: { targetUserId: ownerId, chargerId },
      });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Charger>) => {
      const distance =
        userLocation != null
          ? haversineKm(userLocation, item.location)
          : null;
      return (
        <View style={styles.listItem}>
          <ChargerCardWithProfile
            charger={item}
            distanceKm={distance}
            onPress={handleOpenDetail}
          />
        </View>
      );
    },
    [userLocation, handleOpenDetail],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        {viewMode === 'map' ? (
          <View style={styles.flex}>
            <ChargerMap
              ref={mapRef}
              chargers={visibleChargers}
              selectedId={selectedId}
              onSelectCharger={handleOpenDetail}
              userLocation={userLocation}
            />
            <MapControls
              viewMode={viewMode}
              onToggleView={handleToggleView}
              onFiltersPress={handleOpenFilters}
              onMyLocationPress={handleMyLocation}
              hasUserLocation={userLocation !== null}
              hasActiveFilters={hasActiveFilters}
            />
          </View>
        ) : (
          <View style={styles.flex}>
            <FlatList
              data={visibleChargers}
              keyExtractor={(c) => c.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text
                    style={[
                      theme.typography.body,
                      { color: theme.colors.textMuted, textAlign: 'center' },
                    ]}
                  >
                    No hay cargadores que coincidan con tus filtros.
                  </Text>
                </View>
              }
            />
            <MapControls
              viewMode={viewMode}
              onToggleView={handleToggleView}
              onFiltersPress={handleOpenFilters}
              onMyLocationPress={handleMyLocation}
              hasUserLocation={userLocation !== null}
              hasActiveFilters={hasActiveFilters}
            />
          </View>
        )}
      </SafeAreaView>

      {chargersLoading ? <ChargerLoadingOverlay /> : null}

      <ChargerDetailSheet
        ref={detailSheetRef}
        onContact={handleContact}
        onReview={handleReview}
      />
      <FiltersSheet
        ref={filtersSheetRef}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
      <AlertModal
        visible={loginAlertVisible}
        onClose={() => setLoginAlertVisible(false)}
        title="Iniciá sesión"
        message="Necesitás iniciar sesión para contactar al anfitrión."
        variant="confirm"
        actionLabel="Iniciar sesión"
        onAction={() => router.push('/(public)/login')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  empty: {
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  listItem: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 32,
  },
});

// ---------------------------------------------------------------------------
// ChargerCard + profile fetch wrapper — each card in the FlatList uses this
// so owner data is fetched lazily via TanStack Query (deduplication ensures
// identical query keys only trigger one network request).
// ---------------------------------------------------------------------------
const ChargerCardWithProfile = React.memo(function ChargerCardWithProfile({
  charger,
  distanceKm,
  onPress,
}: {
  charger: Charger;
  distanceKm?: number | null;
  onPress: (id: string) => void;
}) {
  const { data: owner } = useProfileQuery(charger.ownerId);
  const resolvedOwner = owner ?? genericOwnerStub(charger.ownerId);
  return (
    <ChargerCard
      charger={charger}
      owner={resolvedOwner}
      distanceKm={distanceKm}
      onPress={onPress}
    />
  );
});

// Fallback user for owners that aren't in the seed list (e.g. chargers
// created via the host flow). Uses shared stub.
function genericOwnerStub(ownerId: string): User {
  return genericUser(ownerId);
}

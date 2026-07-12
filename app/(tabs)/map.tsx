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
import { fetchProfileById } from '@/features/auth/profileMapper';
import { chargerStore } from '@/data/chargerStore';
import { useChargersQuery } from '@/hooks/useChargersQuery';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { mockUsers } from '@/data/mocks/users';
import { DEFAULT_FILTERS, type Charger, type ChargerFilters, type LatLng, type User } from '@/data/types';
import { applyFilters } from '@/domain/charger';
import { getUserById } from '@/domain/user';
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
  const [filters, setFilters] = useState<ChargerFilters>(DEFAULT_FILTERS);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [loginAlertVisible, setLoginAlertVisible] = useState(false);

  // Auto-select a charger when navigated from profile (?select=<id>).
  useEffect(() => {
    if (selectChargerId) {
      handleOpenDetail(selectChargerId);
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

  // Index users by id once for fast lookup.
  const userById = useMemo<Record<string, User>>(() => {
    const map: Record<string, User> = {};
    for (const u of mockUsers) map[u.id] = u;
    return map;
  }, []);

  // The store is the single source of truth. Subscribing here means
  // newly published chargers appear on the map without a refresh.
  // Use the query hook directly to avoid a double subscription
  // (useChargers() already wraps useChargersQuery() internally).
  const { data: allChargers = [], isLoading: chargersLoading } = useChargersQuery();

  // Apply filters only (no text search — map is for quick browsing).
  const visibleChargers = useMemo<Charger[]>(() => {
    return applyFilters(allChargers, filters, userLocation);
  }, [allChargers, filters, userLocation]);

  const selectedCharger = useMemo<Charger | null>(() => {
    if (!selectedId) return null;
    return visibleChargers.find((c) => c.id === selectedId) ??
      allChargers.find((c) => c.id === selectedId) ??
      null;
  }, [selectedId, visibleChargers, allChargers]);

  // Resolve the real owner from Supabase when a charger is selected.
  const { data: selectedOwner } = useProfileQuery(selectedCharger?.ownerId);

  // Whenever a charger is selected (from the map marker OR from the list
  // card), open the bottom sheet for it. This is what makes the marker
  // press on the map actually surface the bottom sheet.
  useEffect(() => {
    if (selectedCharger && selectedOwner) {
      detailSheetRef.current?.show(selectedCharger, selectedOwner);
    }
  }, [selectedCharger, selectedOwner]);

  const handleOpenDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      // Open the sheet directly — resolve the real owner from Supabase.
      const c = chargerStore.byId(id);
      if (c) {
        void fetchProfileById(c.ownerId).then((o) => {
          detailSheetRef.current?.show(c, o);
        });
      }
    },
    [],
  );

  const handleMyLocation = useCallback(() => {
    if (!userLocation) return;
    mapRef.current?.animateTo(userLocation, 1);
  }, [userLocation]);

  const handleToggleView = useCallback(() => {
    setViewMode((m: MapViewMode) => (m === 'map' ? 'list' : 'map'));
  }, []);

  const handleOpenFilters = useCallback(() => {
    filtersSheetRef.current?.open(filters);
  }, [filters]);

  const handleApplyFilters = useCallback((next: ChargerFilters) => {
    setFilters(next);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

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
            />
          </View>
        )}
      </SafeAreaView>

      {chargersLoading && allChargers.length === 0 && (
        <ChargerLoadingOverlay />
      )}

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
function ChargerCardWithProfile({
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
}

// Fallback user for owners that aren't in the seed list (e.g. chargers
// created via the host flow). Generates a stable ui-avatars URL so the
// visual is consistent with the seed.
const fallbackCache: Record<string, User> = {};
function genericOwnerStub(ownerId: string): User {
  const cached = fallbackCache[ownerId];
  if (cached) return cached;
  const shortId = ownerId.slice(0, 8);
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    shortId,
  )}&background=00C896&color=fff&size=200&bold=true&format=png`;
  const u: User = {
    id: ownerId,
    name: shortId,
    surname: '',
    email: '',
    avatarUrl: url,
    rating: 4.8,
    reviewCount: 0,
    isOnline: true,
    isHost: true,
    joinedAt: new Date().toISOString(),
  };
  fallbackCache[ownerId] = u;
  return u;
}

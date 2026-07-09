import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ChargerCard } from '@/components/charger';
import {
  ChargerDetailSheet,
  type ChargerDetailSheetHandle,
} from '@/components/sheets';
import {
  FiltersSheet,
  type FiltersSheetHandle,
} from '@/components/sheets';
import {
  ChargerMap,
  MapControls,
  type ChargerMapHandle,
  type MapViewMode,
} from '@/components/map';
import { useAuth } from '@/features/auth';
import { useChargers, chargerStore } from '@/data/chargerStore';
import { messageStore } from '@/data/messageStore';
import { mockUsers } from '@/data/mocks/users';
import { DEFAULT_FILTERS, type Charger, type ChargerFilters, type LatLng, type User } from '@/data/types';
import { applyFilters } from '@/domain/charger';
import { getUserById } from '@/domain/user';
import { haversineKm } from '@/lib/distance';
import { useTheme } from '@/theme';

export default function MapScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const mapRef = useRef<ChargerMapHandle | null>(null);
  const detailSheetRef = useRef<ChargerDetailSheetHandle | null>(null);
  const filtersSheetRef = useRef<FiltersSheetHandle | null>(null);

  const [viewMode, setViewMode] = useState<MapViewMode>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ChargerFilters>(DEFAULT_FILTERS);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [query, setQuery] = useState('');

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

  // Index users by id once for fast lookup.
  const userById = useMemo<Record<string, User>>(() => {
    const map: Record<string, User> = {};
    for (const u of mockUsers) map[u.id] = u;
    return map;
  }, []);

  // The store is the single source of truth. Subscribing here means
  // newly published chargers appear on the map without a refresh.
  const allChargers = useChargers();

  // Apply filters + text search.
  const visibleChargers = useMemo<Charger[]>(() => {
    const filtered = applyFilters(allChargers, filters, userLocation);
    if (!query.trim()) return filtered;
    const q = query.toLowerCase();
    return filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.neighborhood.toLowerCase().includes(q),
    );
  }, [allChargers, filters, userLocation, query]);

  const selectedCharger = useMemo<Charger | null>(() => {
    if (!selectedId) return null;
    return visibleChargers.find((c) => c.id === selectedId) ??
      allChargers.find((c) => c.id === selectedId) ??
      null;
  }, [selectedId, visibleChargers, allChargers]);

  const selectedOwner = useMemo<User | null>(() => {
    if (!selectedCharger) return null;
    return getUserById(mockUsers, selectedCharger.ownerId) ?? null;
  }, [selectedCharger]);

  const handleSelectCharger = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleOpenDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      const c = chargerStore.byId(id);
      const o = c ? getUserById(mockUsers, c.ownerId) : undefined;
      if (c && o) {
        detailSheetRef.current?.show(c, o);
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

  // Phase 5 (T-20): "Contactar" in the bottom sheet finds-or-creates
  // a conversation between the current user and the owner, then
  // navigates to the chat screen. The sheet is already closing
  // itself via the `onClose` in `ChargerDetailSheet`.
  const handleContact = useCallback(
    async (ownerId: string) => {
      const me = session?.user;
      if (!me) return;
      if (me.id === ownerId) return; // can't message yourself
      const conv = await messageStore.findOrCreateConversation([me.id, ownerId]);
      router.push(`/messages/${conv.id}`);
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

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Charger>) => {
      const owner = userById[item.ownerId] ?? genericOwnerStub(item.ownerId);
      const distance =
        userLocation != null
          ? haversineKm(userLocation, item.location)
          : null;
      return (
        <View style={{ marginHorizontal: 16, marginVertical: 6 }}>
          <ChargerCard
            charger={item}
            owner={owner}
            distanceKm={distance}
            onPress={handleOpenDetail}
          />
        </View>
      );
    },
    [userById, userLocation, handleOpenDetail],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        {/* Search header */}
        <View style={[styles.searchBar, { backgroundColor: theme.colors.background }]}>
          <View
            style={[
              styles.searchInputWrap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Search color={theme.colors.textMuted} size={18} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar cargadores, barrios o direcciones"
              placeholderTextColor={theme.colors.textLight}
              style={[
                styles.searchInput,
                theme.typography.body,
                { color: theme.colors.text },
              ]}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                accessibilityLabel="Limpiar búsqueda"
                hitSlop={8}
              >
                <X color={theme.colors.textMuted} size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {viewMode === 'map' ? (
          <View style={styles.flex}>
            <ChargerMap
              ref={mapRef}
              chargers={visibleChargers}
              selectedId={selectedId}
              onSelectCharger={handleSelectCharger}
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
              contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
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

      <ChargerDetailSheet
        ref={detailSheetRef}
        onContact={handleContact}
        onViewProfile={handleViewProfile}
      />
      <FiltersSheet
        ref={filtersSheetRef}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  empty: {
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
});

// Fallback user for owners that aren't in the seed list (e.g. chargers
// created via the host flow). Generates a stable ui-avatars URL so the
// visual is consistent with the seed.
const fallbackCache: Record<string, User> = {};
function genericOwnerStub(ownerId: string): User {
  const cached = fallbackCache[ownerId];
  if (cached) return cached;
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    ownerId,
  )}&background=00C896&color=fff&size=200&bold=true&format=png`;
  const u: User = {
    id: ownerId,
    name: 'Anfitrión',
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

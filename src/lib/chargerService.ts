/**
 * Supabase CRUD service for chargers.
 *
 * Maps between the DB row shape (snake_case, PostGIS geography) and
 * the app's `Charger` type (camelCase, plain LatLng). Every function
 * here is a thin async wrapper around supabase-js — no caching, no
 * state management. The store layer owns the in-memory cache.
 */
import { supabase } from '@/lib/supabase';
import type { Charger, DaySchedule, LatLng } from '@/data/types';

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

interface ChargerRow {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  connector_type: string;
  power_kw: number;
  price_per_hour: number;
  status: string;
  /** PostGIS geography — supabase-js returns a GeoJSON object or string. */
  location: unknown;
  address: string;
  neighborhood: string | null;
  city: string;
  rating: number;
  review_count: number;
  amenities: string[] | null;
  photos: string[] | null;
  busy_since: string | null;
  estimated_duration_minutes: number | null;
  schedule: DaySchedule[] | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Row → App mapping
// ---------------------------------------------------------------------------

function rowToCharger(row: ChargerRow): Charger {
  let location: LatLng = { latitude: -34.9011, longitude: -56.1645 }; // default Montevideo
  try {
    if (typeof row.location === 'string') {
      const parsed = JSON.parse(row.location) as { coordinates?: [number, number] };
      if (parsed?.coordinates) {
        location = { latitude: parsed.coordinates[1], longitude: parsed.coordinates[0] };
      }
    } else if (row.location && typeof row.location === 'object') {
      const loc = row.location as { coordinates?: [number, number] };
      if (loc.coordinates) {
        location = { latitude: loc.coordinates[1], longitude: loc.coordinates[0] };
      }
    }
  } catch {
    // fallback to default Montevideo coordinates
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    type: row.connector_type as Charger['type'],
    powerKw: row.power_kw,
    pricePerHour: row.price_per_hour,
    status: row.status as Charger['status'],
    availableInMinutes:
      row.status !== 'available' && row.busy_since && row.estimated_duration_minutes
        ? Math.max(
            0,
            row.estimated_duration_minutes -
              Math.floor((Date.now() - new Date(row.busy_since).getTime()) / 60000),
          )
        : undefined,
    busySince: row.busy_since ?? undefined,
    estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
    location,
    address: row.address,
    neighborhood: row.neighborhood ?? '',
    city: row.city,
    rating: row.rating,
    reviewCount: row.review_count,
    amenities: row.amenities ?? [],
    photos: row.photos ?? [],
    schedule: row.schedule ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Query key — single source of truth for TanStack Query cache key.
// ---------------------------------------------------------------------------

export const CHARGER_QUERY_KEY = ['chargers'] as const;

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** Fetch all chargers via RPC. Returns jsonb with ST_AsGeoJSON location. */
export async function fetchAllChargers(): Promise<Charger[]> {
  const { data, error } = await supabase.rpc('fetch_chargers_rpc');

  if (error || !data) {
    console.error('[chargerService] fetchAllChargers ERROR:', error?.message);
    return [];
  }

  console.log('[chargerService] fetchAllChargers OK:', data.length, 'chargers');
  const mapped = (data as ChargerRow[]).map(rowToCharger);
  console.log('[chargerService] first charger:', JSON.stringify(mapped[0], null, 2));
  return mapped;
}

/** Insert a new charger via RPC (avoids PostGIS GeoJSON serialization). */
export async function insertCharger(input: {
  ownerId: string;
  title: string;
  description: string;
  type: string;
  powerKw: number;
  pricePerHour: number;
  location: LatLng;
  address: string;
  neighborhood: string;
  city: string;
  photos: string[];
  status?: string;
  schedule?: DaySchedule[];
}): Promise<Charger> {
  const { data, error } = await supabase.rpc('insert_charger_rpc', {
    p_owner_id: input.ownerId,
    p_title: input.title,
    p_description: input.description,
    p_connector_type: input.type,
    p_power_kw: input.powerKw,
    p_price_per_hour: input.pricePerHour,
    p_lat: input.location.latitude,
    p_lng: input.location.longitude,
    p_address: input.address,
    p_neighborhood: input.neighborhood,
    p_city: input.city,
    p_status: input.status ?? 'available',
    p_photos: input.photos,
    ...(input.schedule !== undefined ? { p_schedule: input.schedule } : {}),
  });

  if (error || !data) {
    throw new Error(`insertCharger: ${error?.message ?? 'no data'}`);
  }
  return rowToCharger(data as ChargerRow);
}

/** Update an existing charger. */
export async function updateCharger(
  id: string,
  patch: {
    title?: string;
    description?: string;
    type?: string;
    powerKw?: number;
    pricePerHour?: number;
    location?: LatLng;
    address?: string;
    neighborhood?: string;
    city?: string;
    photos?: string[];
    status?: string;
    busySince?: string | null;
    estimatedDurationMinutes?: number | null;
    schedule?: DaySchedule[];
  },
): Promise<Charger> {
  const { data, error } = await supabase.rpc('update_charger_rpc', {
    p_id: id,
    ...(patch.title !== undefined ? { p_title: patch.title } : {}),
    ...(patch.description !== undefined ? { p_description: patch.description } : {}),
    ...(patch.type !== undefined ? { p_connector_type: patch.type } : {}),
    ...(patch.powerKw !== undefined ? { p_power_kw: patch.powerKw } : {}),
    ...(patch.pricePerHour !== undefined ? { p_price_per_hour: patch.pricePerHour } : {}),
    ...(patch.location !== undefined ? { p_lat: patch.location.latitude, p_lng: patch.location.longitude } : {}),
    ...(patch.address !== undefined ? { p_address: patch.address } : {}),
    ...(patch.neighborhood !== undefined ? { p_neighborhood: patch.neighborhood } : {}),
    ...(patch.city !== undefined ? { p_city: patch.city } : {}),
    ...(patch.status !== undefined ? { p_status: patch.status } : {}),
    ...(patch.photos !== undefined ? { p_photos: patch.photos } : {}),
    ...(patch.busySince !== undefined ? { p_busy_since: patch.busySince } : {}),
    ...(patch.estimatedDurationMinutes !== undefined
      ? { p_estimated_duration_minutes: patch.estimatedDurationMinutes }
      : {}),
    ...(patch.schedule !== undefined ? { p_schedule: patch.schedule } : {}),
  });

  if (error || !data) {
    throw new Error(`updateCharger: ${error?.message ?? 'no data'}`);
  }
  return rowToCharger(data as ChargerRow);
}

/** Delete a charger by id. */
export async function deleteCharger(id: string): Promise<void> {
  const { error } = await supabase.from('chargers').delete().eq('id', id);
  if (error) {
    throw new Error(`deleteCharger: ${error.message}`);
  }
}

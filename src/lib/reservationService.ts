/**
 * Supabase service for reservations.
 *
 * Maps between the RPC response shape (snake_case) and the app's
 * `Reservation` / `ReservationWithCharger` types (camelCase).
 * Every function is a thin async wrapper around supabase-js RPCs.
 */
import { supabase } from '@/lib/supabase';
import type {
  Charger,
  DaySchedule,
  LatLng,
  Reservation,
  ReservationWithCharger,
  User,
} from '@/data/types';

// ---------------------------------------------------------------------------
// Query key — single source of truth for TanStack Query cache key.
// ---------------------------------------------------------------------------

export const RESERVATIONS_KEY = ['reservations'] as const;

// ---------------------------------------------------------------------------
// RPC response row types
// ---------------------------------------------------------------------------

interface ReservationRow {
  id: string;
  driver_id: string;
  charger_id: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

interface ChargerPickRow {
  id: string;
  title: string;
  address: string;
  location: unknown;
  power_kw: number;
  type: string;
}

interface DriverPickRow {
  id: string;
  name: string;
  surname: string;
  avatar_url: string;
}

interface DriverReservationRow extends ReservationRow {
  charger: ChargerPickRow;
}

interface HostReservationRow extends ReservationRow {
  charger: ChargerPickRow;
  driver: DriverPickRow;
}

// ---------------------------------------------------------------------------
// Row → domain mapping
// ---------------------------------------------------------------------------

function parseLocation(raw: unknown): LatLng {
  const defaultLoc: LatLng = { latitude: -34.9011, longitude: -56.1645 };
  try {
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw) as { coordinates?: [number, number] };
      if (parsed?.coordinates) {
        return { latitude: parsed.coordinates[1], longitude: parsed.coordinates[0] };
      }
    } else if (raw && typeof raw === 'object') {
      const loc = raw as { coordinates?: [number, number] };
      if (loc.coordinates) {
        return { latitude: loc.coordinates[1], longitude: loc.coordinates[0] };
      }
    }
  } catch {
    // fallback
  }
  return defaultLoc;
}

function rowToReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    driverId: row.driver_id,
    chargerId: row.charger_id,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status as Reservation['status'],
    createdAt: row.created_at,
  };
}

function rowToReservationWithCharger(
  row: DriverReservationRow | HostReservationRow,
): ReservationWithCharger {
  const base = rowToReservation(row);
  const charger: ReservationWithCharger['charger'] = {
    id: row.charger.id,
    title: row.charger.title,
    address: row.charger.address,
    location: parseLocation(row.charger.location),
    powerKw: row.charger.power_kw,
    type: row.charger.type as Charger['type'],
  };

  const result: ReservationWithCharger = { ...base, charger };

  // Host view includes driver profile
  if ('driver' in row && row.driver) {
    result.driver = {
      id: row.driver.id,
      name: row.driver.name,
      surname: row.driver.surname,
      avatarUrl: row.driver.avatar_url,
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// CRUD — RPC wrappers
// ---------------------------------------------------------------------------

/** Create a reservation via RPC. Returns the new reservation. */
export async function createReservation(
  chargerId: string,
  startTime: string,
  endTime: string,
): Promise<Reservation> {
  const { data, error } = await supabase.rpc('create_reservation_rpc', {
    p_charger_id: chargerId,
    p_start_time: startTime,
    p_end_time: endTime,
  });

  if (error || !data) {
    throw new Error(`createReservation: ${error?.message ?? 'no data'}`);
  }

  return rowToReservation(data as ReservationRow);
}

/** Cancel a reservation via RPC. */
export async function cancelReservation(reservationId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_reservation_rpc', {
    p_reservation_id: reservationId,
  });

  if (error) {
    throw new Error(`cancelReservation: ${error.message}`);
  }
}

/** Fetch the authenticated driver's own reservations with charger metadata. */
export async function getDriverReservations(): Promise<ReservationWithCharger[]> {
  const { data, error } = await supabase.rpc('get_driver_reservations_rpc');

  if (error || !data) {
    console.error('[reservationService] getDriverReservations ERROR:', error?.message);
    return [];
  }

  return (data as DriverReservationRow[]).map(rowToReservationWithCharger);
}

/** Fetch reservations on chargers owned by the authenticated host, with driver profile. */
export async function getHostReservations(): Promise<ReservationWithCharger[]> {
  const { data, error } = await supabase.rpc('get_host_reservations_rpc');

  if (error || !data) {
    console.error('[reservationService] getHostReservations ERROR:', error?.message);
    return [];
  }

  return (data as HostReservationRow[]).map(rowToReservationWithCharger);
}

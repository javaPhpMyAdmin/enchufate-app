/**
 * Core domain types for Enchufate.
 *
 * Keep this file dependency-free (no React Native imports) so it can be
 * consumed by the data layer, the API layer (future), and tests.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export type ChargerStatus = 'available' | 'reserved' | 'busy';

export type ConnectorType =
  | 'type1'
  | 'type2'
  | 'ccs'
  | 'chademo'
  | 'tesla';

/** A single day's availability in the weekly schedule. */
export interface DaySchedule {
  day: number;       // 0=Sun .. 6=Sat
  enabled: boolean;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

/**
 * Unified User type — covers both the authenticated driver (own profile)
 * and the public owner (other users' profiles).
 *
 * - `email` / `phone?` / `city?` / `bio?` are "private" and only shown on
 *   the user's own profile; the public profile should never display them.
 * - `rating` / `reviewCount` / `isHost` / `isOnline` are the public surface
 *   that the map, charger cards, and public profile all consume.
 * - `surname` is split from `name` so forms can edit each independently
 *   (matches the registration form).
 */
export interface User {
  id: string;
  name: string;
  surname: string;
  /** Always required — even mock owners have an email; the auth user
   *  always has one. Empty string allowed for legacy sessions. */
  email: string;
  phone?: string;
  city?: string;
  avatarUrl: string;
  /** 0..5; for hosts aggregated from reviews. */
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  isHost: boolean;
  /** ISO date string. */
  joinedAt: string;
  /** Optional short bio (max 200 chars). Only meaningful for hosts. */
  bio?: string;
}

export interface Charger {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  type: ConnectorType;
  powerKw: number;
  pricePerHour: number; // USD
  status: ChargerStatus;
  /** Minutes until the charger is free. Only set for reserved/busy chargers. */
  availableInMinutes?: number;
  /** ISO 8601 timestamp when the charger was set to busy. */
  busySince?: string;
  /** Estimated duration in minutes chosen by the host. */
  estimatedDurationMinutes?: number;
  location: LatLng;
  address: string;
  neighborhood: string;
  city: string;
  rating: number; // 0..5
  reviewCount: number;
  amenities?: string[];
  photos?: string[];
  schedule?: DaySchedule[];
}

/**
 * Review — a 1-5 star rating plus a comment that one user left about
 * another. `targetUserId` is the user being reviewed (the host);
 * `authorId` is the driver who left the review; `chargerId` ties the
 * review to a specific charger.
 */
export interface Review {
  id: string;
  targetUserId: string;
  authorId: string;
  chargerId: string;
  /** 1..5 */
  rating: number;
  comment: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/**
 * A 1:1 conversation between two users (drivers and/or hosts). v1
 * intentionally caps participants at 2; group chats are out of scope.
 *
 * `lastMessagePreview` and `lastMessageAt` are denormalized for fast
 * rendering of the conversations list without joining against the
 * messages table on every render.
 *
 * `unreadCountByUser` is a per-user unread counter. Only the recipient
 * increments on a new message; the sender's own count never goes up.
 */
export interface Conversation {
  id: string;
  /** Two user ids (v1). Order is not significant — comparisons sort first. */
  participantIds: string[];
  /** Preview text of the most recent message (truncated to ~80 chars). */
  lastMessagePreview: string;
  /** ISO 8601 timestamp of the most recent message. */
  lastMessageAt: string;
  /** userId -> count of unread messages for that user. */
  unreadCountByUser: Record<string, number>;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/**
 * A single message inside a `Conversation`. Body is a plain string —
 * no media, no formatting. v1 keeps it simple.
 *
 * `readBy` tracks who has read the message. The sender is always added
 * on creation; each time a recipient opens the conversation, their id
 * is appended. Read receipts in the UI derive from this list.
 */
export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  /** 1..1000 chars; trimmed; non-empty. */
  body: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** User ids that have read this message. Always includes the author. */
  readBy: string[];
}

export interface ChargerFilters {
  status: ChargerStatus[];
  connectorTypes: ConnectorType[];
  /** Inclusive [min, max] in kW. */
  powerRange: [number, number];
  /** Inclusive [min, max] in USD per hour. */
  priceRange: [number, number];
  /** Optional max distance from user location, in km. */
  maxDistanceKm?: number;
}

export const DEFAULT_FILTERS: ChargerFilters = {
  status: ['available', 'reserved', 'busy'],
  connectorTypes: [],
  powerRange: [0, 50],
  priceRange: [0, 50],
  maxDistanceKm: undefined,
};

export const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  type1: 'Tipo 1',
  type2: 'Tipo 2',
  ccs: 'CCS',
  chademo: 'CHAdeMO',
  tesla: 'Tesla',
};

export const STATUS_LABELS: Record<ChargerStatus, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  busy: 'Ocupado',
};

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

export interface Reservation {
  id: string;
  driverId: string;
  chargerId: string;
  startTime: string | null; // nullable — confirmed via chat
  endTime: string | null; // nullable — confirmed via chat
  status: ReservationStatus;
  createdAt: string; // ISO 8601
}

export interface ReservationWithCharger extends Reservation {
  charger: Pick<Charger, 'id' | 'title' | 'address' | 'location' | 'powerKw' | 'type' | 'ownerId'>;
  driver?: Pick<User, 'id' | 'name' | 'surname' | 'avatarUrl'>; // host view only
}

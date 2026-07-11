import type { Review } from '../types';

/**
 * 20 mock reviews — 2 per user across the 10 seed users. Distribution:
 *   - ratings 3..5 (no 1-2 star reviews in mock data; first negative
 *     reviews land in Phase 6 with the real write path)
 *   - dates spread across the last 6 months
 *   - comments in Argentinian Spanish, 1-2 sentences, varied tone
 *
 * Authors are always other users from the same pool so ReviewCard
 * can resolve `authorId -> User` from `mocks/users.ts` directly.
 */
const NOW = Date.now();
const DAY = 1000 * 60 * 60 * 24;

function daysAgo(days: number): string {
  return new Date(NOW - days * DAY).toISOString();
}

export const mockReviews: Review[] = [
  // --- u_01 Sofía Méndez ---
  {
    id: 'r_01',
    targetUserId: 'u_01',
    authorId: 'u_02',
    chargerId: 'c_01',
    rating: 5,
    comment:
      'Sofi me abrió la cochera sin problema a las 11 de la noche. Cargador impecable, súper recomendable.',
    createdAt: daysAgo(8),
  },
  {
    id: 'r_02',
    targetUserId: 'u_01',
    authorId: 'u_05',
    chargerId: 'c_01',
    rating: 5,
    comment:
      'Todo perfecto. La app me avisó cuando estaba listo y la carga fue rapidísima.',
    createdAt: daysAgo(34),
  },

  // --- u_02 Tomás Aguirre ---
  {
    id: 'r_03',
    targetUserId: 'u_02',
    authorId: 'u_03',
    chargerId: 'c_05',
    rating: 4,
    comment:
      'Buen cargador en Belgrano. La entrada del garage es un poco estrecha para una SUV.',
    createdAt: daysAgo(3),
  },
  {
    id: 'r_04',
    targetUserId: 'u_02',
    authorId: 'u_07',
    chargerId: 'c_05',
    rating: 5,
    comment:
      'Tomás super atento. Me mandó instrucciones claras y dejó el cargador listo para usar.',
    createdAt: daysAgo(67),
  },

  // --- u_03 Camila Russo ---
  {
    id: 'r_05',
    targetUserId: 'u_03',
    authorId: 'u_04',
    chargerId: 'c_02',
    rating: 5,
    comment:
      'La carga rápida CCS me salvó el viaje a Mar del Plata. Cami muy amable, 10 puntos.',
    createdAt: daysAgo(2),
  },
  {
    id: 'r_06',
    targetUserId: 'u_03',
    authorId: 'u_09',
    chargerId: 'c_02',
    rating: 5,
    comment:
      'El mejor cargador de la zona. Reservé 30 min antes y ya estaba todo listo.',
    createdAt: daysAgo(21),
  },

  // --- u_04 Joaquín Pereyra ---
  {
    id: 'r_07',
    targetUserId: 'u_04',
    authorId: 'u_06',
    chargerId: 'c_06',
    rating: 4,
    comment:
      'Barrio tranquilo, ideal para dejar el auto cargando sin preocupaciones. Volveré.',
    createdAt: daysAgo(12),
  },
  {
    id: 'r_08',
    targetUserId: 'u_04',
    authorId: 'u_10',
    chargerId: 'c_06',
    rating: 4,
    comment:
      'Joaco estuvo atento por mensaje. La potencia es menor a la anunciada pero carga igual.',
    createdAt: daysAgo(48),
  },

  // --- u_05 Martina López ---
  {
    id: 'r_09',
    targetUserId: 'u_05',
    authorId: 'u_01',
    chargerId: 'c_03',
    rating: 5,
    comment:
      'Martina es una genia. Me ayudó con la conexión del cable y hasta me ofreció café.',
    createdAt: daysAgo(5),
  },
  {
    id: 'r_10',
    targetUserId: 'u_05',
    authorId: 'u_08',
    chargerId: 'c_03',
    rating: 5,
    comment:
      'Anfitriona de lujo. La cochera está impecable y el cargador funciona perfecto.',
    createdAt: daysAgo(40),
  },

  // --- u_06 Federico Bianchi ---
  {
    id: 'r_11',
    targetUserId: 'u_06',
    authorId: 'u_05',
    chargerId: 'c_07',
    rating: 4,
    comment:
      'Fede recién empieza pero se nota que tiene buena onda. El precio es muy conveniente.',
    createdAt: daysAgo(15),
  },
  {
    id: 'r_12',
    targetUserId: 'u_06',
    authorId: 'u_03',
    chargerId: 'c_07',
    rating: 4,
    comment:
      'Buena experiencia. El cargador anduvo perfecto y Fede respondió rápido mis dudas.',
    createdAt: daysAgo(75),
  },

  // --- u_07 Lucía Ferreyra ---
  {
    id: 'r_13',
    targetUserId: 'u_07',
    authorId: 'u_02',
    chargerId: 'c_04',
    rating: 5,
    comment:
      'Lucía súper atenta. La cochera cubierta en Recoleta es un golazo cuando llueve.',
    createdAt: daysAgo(1),
  },
  {
    id: 'r_14',
    targetUserId: 'u_07',
    authorId: 'u_09',
    chargerId: 'c_04',
    rating: 5,
    comment:
      'Cinco estrellas. Reservé, llegué y en 5 minutos ya estaba cargando. Muy prolijo todo.',
    createdAt: daysAgo(28),
  },

  // --- u_08 Diego Salazar ---
  {
    id: 'r_15',
    targetUserId: 'u_08',
    authorId: 'u_10',
    chargerId: 'c_08',
    rating: 3,
    comment:
      'El cargador está bien pero tuve que coordinar por mensaje y tardó en responder.',
    createdAt: daysAgo(9),
  },
  {
    id: 'r_16',
    targetUserId: 'u_08',
    authorId: 'u_04',
    chargerId: 'c_08',
    rating: 4,
    comment:
      'Diego se tomó el tiempo de explicarme cómo funcionaba el cargador. Buen trato.',
    createdAt: daysAgo(53),
  },

  // --- u_09 Valentina Castro ---
  {
    id: 'r_17',
    targetUserId: 'u_09',
    authorId: 'u_01',
    chargerId: 'c_09',
    rating: 5,
    comment:
      'Cargar con energía solar fue un golazo. Vale la pena aunque sea un poquito más lejos.',
    createdAt: daysAgo(6),
  },
  {
    id: 'r_18',
    targetUserId: 'u_09',
    authorId: 'u_07',
    chargerId: 'c_09',
    rating: 5,
    comment:
      'Vale es super amable. La estación carga rápido y se nota que mantiene todo impecable.',
    createdAt: daysAgo(31),
  },

  // --- u_10 Nicolás Romero ---
  {
    id: 'r_19',
    targetUserId: 'u_10',
    authorId: 'u_08',
    chargerId: 'c_10',
    rating: 5,
    comment:
      'Nico resolvió todo por la app. Llegué, cargué y me fui. Cinco estrellas.',
    createdAt: daysAgo(11),
  },
  {
    id: 'r_20',
    targetUserId: 'u_10',
    authorId: 'u_02',
    chargerId: 'c_10',
    rating: 4,
    comment:
      'Buen cargador en Belgrano R. El precio es justo y Nico siempre responde los mensajes.',
    createdAt: daysAgo(60),
  },
];

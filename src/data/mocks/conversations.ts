import type { Conversation, Message } from '../types';

/**
 * Seeded conversations for the Mensajes tab.
 *
 * Strategy:
 * - We use the placeholder id `current_user` as one of the participants.
 *   The real auth user (whose id is generated at sign-in, e.g. `u_<ts>`)
 *   is NOT in the seed users list (mocks/users.ts has u_01..u_10).
 * - On the first call to `conversationsForUser(authUserId)`, the store
 *   migrates these placeholders in-memory to the real user id. This way
 *   the conversations list is not empty on first launch.
 * - If the user has already used "Contactar" (so a real conversation
 *   exists), the migration is skipped — no data is overwritten.
 *
 * 3 conversations × ~10 messages = 30 seeded messages, with ~2-3
 * unread per conversation for the current user.
 */
const NOW = Date.now();
const MIN = 1000 * 60;
const HOUR = MIN * 60;
const DAY = HOUR * 24;

function minutesAgo(min: number): string {
  return new Date(NOW - min * MIN).toISOString();
}

function hoursAgo(h: number): string {
  return new Date(NOW - h * HOUR).toISOString();
}

function daysAgo(d: number): string {
  return new Date(NOW - d * DAY).toISOString();
}

/**
 * Placeholder id used for the current user in the seed. The store
 * replaces this with the real auth id on first hydration. Re-exported
 * from the store via a constant so the public API stays stable.
 */
export const SEED_CURRENT_USER_PLACEHOLDER = 'current_user';

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export const mockConversations: Conversation[] = [
  {
    id: 'conv_seed_01',
    participantIds: [SEED_CURRENT_USER_PLACEHOLDER, 'u_02'],
    lastMessagePreview: 'Listo, nos vemos a las 18',
    lastMessageAt: minutesAgo(8),
    unreadCountByUser: {
      [SEED_CURRENT_USER_PLACEHOLDER]: 2,
      u_02: 0,
    },
    createdAt: daysAgo(3),
  },
  {
    id: 'conv_seed_02',
    participantIds: [SEED_CURRENT_USER_PLACEHOLDER, 'u_04'],
    lastMessagePreview: '¿Tiene cochera cubierta?',
    lastMessageAt: hoursAgo(4),
    unreadCountByUser: {
      [SEED_CURRENT_USER_PLACEHOLDER]: 3,
      u_04: 0,
    },
    createdAt: daysAgo(2),
  },
  {
    id: 'conv_seed_03',
    participantIds: [SEED_CURRENT_USER_PLACEHOLDER, 'u_07'],
    lastMessagePreview: 'Perfecto, gracias!',
    lastMessageAt: daysAgo(1),
    unreadCountByUser: {
      [SEED_CURRENT_USER_PLACEHOLDER]: 1,
      u_07: 0,
    },
    createdAt: daysAgo(5),
  },
];

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Helper to stamp a batch of messages with the same conversation id
 * and the appropriate `readBy` membership (the author always reads
 * their own message).
 */
function msg(
  conversationId: string,
  id: string,
  authorId: string,
  body: string,
  createdAt: string,
  readBy: string[] = [authorId],
): Message {
  return { id, conversationId, authorId, body, createdAt, readBy };
}

export const mockMessages: Message[] = [
  // --- conv_seed_01 — current_user ↔ u_02 (Tomás Aguirre) ---
  msg(
    'conv_seed_01',
    'msg_01_01',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Hola Tomás! Vi tu cargador de Belgrano, ¿está disponible este finde?',
    daysAgo(3),
  ),
  msg(
    'conv_seed_01',
    'msg_01_02',
    'u_02',
    'Hola! Sí, está libre el sábado a la tarde. ¿Qué modelo de auto cargás?',
    daysAgo(3),
  ),
  msg(
    'conv_seed_01',
    'msg_01_03',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Un Renault Zoe, necesita Tipo 2. Me sirve perfecto.',
    daysAgo(3),
  ),
  msg(
    'conv_seed_01',
    'msg_01_04',
    'u_02',
    'Buenísimo, el cargador es Tipo 2 de 7.4 kW. Te paso la dirección exacta por acá.',
    daysAgo(3),
  ),
  msg(
    'conv_seed_01',
    'msg_01_05',
    'u_02',
    'Pasame un horario que te quede cómodo y coordino con el portero.',
    hoursAgo(22),
  ),
  msg(
    'conv_seed_01',
    'msg_01_06',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Genial. ¿Te sirve a las 18?',
    hoursAgo(20),
  ),
  msg(
    'conv_seed_01',
    'msg_01_07',
    'u_02',
    'Sí, perfecto. Dejame tu nombre para avisarle al portero.',
    hoursAgo(19),
  ),
  msg(
    'conv_seed_01',
    'msg_01_08',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Soy Pablo Méndez, llego en un Renault Zoe azul.',
    minutesAgo(15),
  ),
  // Unread (author = u_02)
  msg(
    'conv_seed_01',
    'msg_01_09',
    'u_02',
    'Anotado. La cochera queda en Cabildo 2890, te abro a las 18 en punto.',
    minutesAgo(10),
    ['u_02'],
  ),
  msg(
    'conv_seed_01',
    'msg_01_10',
    'u_02',
    'Listo, nos vemos a las 18',
    minutesAgo(8),
    ['u_02'],
  ),

  // --- conv_seed_02 — current_user ↔ u_04 (Joaquín Pereyra) ---
  msg(
    'conv_seed_02',
    'msg_02_01',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Buenas! Me interesa el cargador de Caballito. ¿Sigue disponible?',
    daysAgo(2),
  ),
  msg(
    'conv_seed_02',
    'msg_02_02',
    'u_04',
    'Hola Pablo, sí está disponible. Tipo 2 de 7.4 kW.',
    daysAgo(2),
  ),
  msg(
    'conv_seed_02',
    'msg_02_03',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Genial. ¿Tiene cochera cubierta?',
    daysAgo(2),
  ),
  msg(
    'conv_seed_02',
    'msg_02_04',
    'u_04',
    'Sí, está cubierto, así que no te preocupás por la lluvia.',
    daysAgo(2),
  ),
  msg(
    'conv_seed_02',
    'msg_02_05',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Perfecto. ¿Puedo pasar el viernes a la noche?',
    daysAgo(1),
  ),
  msg(
    'conv_seed_02',
    'msg_02_06',
    'u_04',
    'El viernes a la noche está complicado, tengo compromiso. ¿Sábado al mediodía?',
    daysAgo(1),
  ),
  msg(
    'conv_seed_02',
    'msg_02_07',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Sábado al mediodía me sirve. ¿A qué hora?',
    hoursAgo(6),
  ),
  // Unread (author = u_04)
  msg(
    'conv_seed_02',
    'msg_02_08',
    'u_04',
    'A las 12 te queda bien?',
    hoursAgo(5),
    ['u_04'],
  ),
  msg(
    'conv_seed_02',
    'msg_02_09',
    'u_04',
    'Confirmame así reservo el horario.',
    hoursAgo(5),
    ['u_04'],
  ),
  msg(
    'conv_seed_02',
    'msg_02_10',
    'u_04',
    'Cualquier cosa avisame por acá.',
    hoursAgo(4),
    ['u_04'],
  ),

  // --- conv_seed_03 — current_user ↔ u_07 (Lucía Ferreyra) ---
  msg(
    'conv_seed_03',
    'msg_03_01',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Hola Lucía! Tu cargador de Recoleta me interesa. ¿Está disponible?',
    daysAgo(5),
  ),
  msg(
    'conv_seed_03',
    'msg_03_02',
    'u_07',
    'Hola! Sí, libre esta semana. Tipo 2 con cochera cubierta.',
    daysAgo(5),
  ),
  msg(
    'conv_seed_03',
    'msg_03_03',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Genial, ¿podemos coordinar para mañana a la tarde?',
    daysAgo(4),
  ),
  msg(
    'conv_seed_03',
    'msg_03_04',
    'u_07',
    'Mañana a las 17 tengo libre. ¿Te sirve?',
    daysAgo(4),
  ),
  msg(
    'conv_seed_03',
    'msg_03_05',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Perfecto, a las 17 entonces.',
    daysAgo(4),
  ),
  msg(
    'conv_seed_03',
    'msg_03_06',
    'u_07',
    'Avisame cuando estés por la zona. Te abro la cochera desde la app.',
    daysAgo(3),
  ),
  msg(
    'conv_seed_03',
    'msg_03_07',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Dale, ya estoy por Junín. En 5 min llego.',
    daysAgo(2),
  ),
  msg(
    'conv_seed_03',
    'msg_03_08',
    'u_07',
    'Te dejé la puerta abierta. Carga tranquila y avisame al terminar.',
    daysAgo(2),
  ),
  msg(
    'conv_seed_03',
    'msg_03_09',
    SEED_CURRENT_USER_PLACEHOLDER,
    'Listo, ya terminé. La carga anduvo perfecto.',
    daysAgo(1),
  ),
  // Unread (author = u_07)
  msg(
    'conv_seed_03',
    'msg_03_10',
    'u_07',
    'Perfecto, gracias!',
    daysAgo(1),
    ['u_07'],
  ),
];

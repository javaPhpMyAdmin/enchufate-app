/**
 * Photo upload helpers — pushes local gallery images to Supabase Storage
 * and returns public URLs that can be stored in the chargers table.
 *
 * Bucket: `charger-photos` (public read, authenticated write).
 * Create it in the Supabase dashboard if it doesn't exist yet:
 *   - id: charger-photos
 *   - public: true
 *   - file_size_limit: 5 MB
 *   - allowed MIME types: image/jpeg, image/png, image/webp
 */
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

const BUCKET = 'charger-photos';

/**
 * Derive a MIME-safe file extension from a local URI.
 * Falls back to `jpg` when the extension is missing or ambiguous.
 */
function extFromUri(uri: string): string {
  const raw = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  // Normalise common variants
  if (raw === 'jpeg') return 'jpg';
  if (['png', 'webp', 'jpg'].includes(raw)) return raw;
  return 'jpg';
}

/**
 * Upload a single local image URI to Supabase Storage and return the
 * public URL.  The file is stored under `{userId}/{timestamp}-{random}.{ext}`
 * to avoid collisions.
 */
export async function uploadChargerPhoto(
  localUri: string,
  userId: string,
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64);

  const ext = extFromUri(localUri);
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, arrayBuffer, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: false,
    });

  if (error) {
    console.error('[photoUpload] upload error:', error.message);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

/**
 * Upload multiple local image URIs in parallel (max 5).
 * Returns an array of public URLs in the same order as the input.
 */
export async function uploadChargerPhotos(
  localUris: string[],
  userId: string,
): Promise<string[]> {
  return Promise.all(localUris.map((uri) => uploadChargerPhoto(uri, userId)));
}

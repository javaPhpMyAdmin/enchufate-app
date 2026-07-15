/**
 * RLS policies for the `charger-photos` Storage bucket.
 *
 * - Authenticated users can upload their own photos (under their userId path).
 * - Anyone can read (public bucket).
 */
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'charger-photos',
  'charger-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files under their own userId folder
CREATE POLICY "Authenticated users can upload charger photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'charger-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update their own charger photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'charger-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete their own charger photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'charger-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access for everyone
CREATE POLICY "Public read access for charger photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'charger-photos');

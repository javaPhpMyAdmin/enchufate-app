-- Allow anyone (including anon) to read public profile fields.
-- Profiles contain only public-facing data (display_name, avatar, rating)
-- so there's no privacy concern with a public SELECT policy.
-- This fixes the owner name resolving to "Anfitrión" on the map
-- when the fetch runs before auth is ready or for non-logged-in users.

create policy "profiles_select_public"
  on public.profiles
  for select
  using (true);

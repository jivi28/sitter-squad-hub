-- Fix infinite recursion in RLS policies by moving cross-table checks into SECURITY DEFINER functions

-- 1) Helper functions (bypass RLS)
create or replace function public.is_booking_owner(_booking_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = _booking_id
      and b.user_id = _user_id
  )
$$;

create or replace function public.is_sitter_for_booking(_booking_id uuid, _sitter_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.sitters s on s.id = b.sitter_id
    where b.id = _booking_id
      and s.user_id = _sitter_user_id
  )
$$;

create or replace function public.has_confirmed_booking_with_sitter(_sitter_id uuid, _parent_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.sitter_id = _sitter_id
      and b.user_id = _parent_user_id
      and b.status = 'confirmed'
      and b.payment_status = any (array['completed','paid'])
  )
$$;

create or replace function public.has_booking_with_parent(_sitter_user_id uuid, _parent_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.sitters s on s.id = b.sitter_id
    where s.user_id = _sitter_user_id
      and b.user_id = _parent_user_id
  )
$$;

-- 2) Update policies to use the helper functions (no cross-table RLS recursion)

-- bookings
drop policy if exists "Sitters can view their assigned bookings" on public.bookings;
create policy "Sitters can view their assigned bookings"
on public.bookings
for select
to public
using (public.is_sitter_for_booking(id, auth.uid()));

drop policy if exists "Sitters can update status of their assigned bookings" on public.bookings;
create policy "Sitters can update status of their assigned bookings"
on public.bookings
for update
to public
using (public.is_sitter_for_booking(id, auth.uid()))
with check (public.is_sitter_for_booking(id, auth.uid()));

-- sitters
drop policy if exists "Parents with confirmed bookings can view sitter contact info" on public.sitters;
create policy "Parents with confirmed bookings can view sitter contact info"
on public.sitters
for select
to public
using (public.has_confirmed_booking_with_sitter(id, auth.uid()));

-- profiles
drop policy if exists "Sitters can view parent profiles for their bookings" on public.profiles;
create policy "Sitters can view parent profiles for their bookings"
on public.profiles
for select
to public
using (public.has_booking_with_parent(auth.uid(), profiles.user_id));

-- booking_responses
drop policy if exists "Parents can view responses to their bookings" on public.booking_responses;
create policy "Parents can view responses to their bookings"
on public.booking_responses
for select
to public
using (public.is_booking_owner(booking_id, auth.uid()));

-- Run once in a new Supabase project's SQL editor. All access is server-side.
create table if not exists public.fitters (
 id text primary key, name text not null, type text not null check(type in ('fixed','mobile')),
 phone text not null, phone2 text not null default '', whatsapp text not null default '', photo_url text not null default '',
 latitude double precision not null, longitude double precision not null, neighborhood text not null,
 services jsonb not null, working_hours jsonb not null,
 status text not null default 'pending' check(status in ('pending','approved')), demo boolean not null default false, created_at text not null
);
create index if not exists fitter_status on public.fitters(status);
create table if not exists public.reviews (
 id text primary key, fitter_id text not null references public.fitters(id) on delete cascade,
 reviewer_name text not null, rating integer not null check(rating between 1 and 5), comment text not null,
 status text not null default 'pending' check(status in ('pending','approved')), created_at text not null
);
create index if not exists review_fitter_status on public.reviews(fitter_id,status);
create table if not exists public.contacts(id text primary key,name text not null,email text not null,message text not null,created_at text not null);
create table if not exists public.rate_limits(key text primary key,count integer not null,expires bigint not null);
-- Dispatch requests: created per user request, assigned to nearest fitter
create table if not exists public.dispatch_requests (
  id               text primary key,
  fitter_id        text not null references public.fitters(id) on delete cascade,
  user_lat         double precision not null,
  user_lng         double precision not null,
  user_phone       text not null,
  user_note        text not null default '',
  status           text not null default 'pending'
                     check(status in ('pending','accepted','en_route','completed','declined','expired','reassigning')),
  fitter_token     text not null unique,
  user_token       text not null unique,
  tried_fitters    text not null default '[]',
  reassign_count   integer not null default 0,
  expires_at       text not null,
  created_at       text not null,
  accepted_at      text,
  completed_at     text,
  fitter_lat       double precision,
  fitter_lng       double precision
);
create index if not exists dispatch_fitter_token on public.dispatch_requests(fitter_token);
create index if not exists dispatch_user_token on public.dispatch_requests(user_token);
create index if not exists dispatch_status_created on public.dispatch_requests(status, created_at);
-- Fitter dashboards: one-per-fitter, holds live location & online status
create table if not exists public.fitter_dashboards (
  id           text primary key,
  fitter_id    text not null unique references public.fitters(id) on delete cascade,
  code         text not null unique,
  created_at   text not null,
  is_online    boolean not null default false,
  current_lat  double precision,
  current_lng  double precision
);
create index if not exists fitter_dashboard_code on public.fitter_dashboards(code);
alter table public.fitters enable row level security;
alter table public.reviews enable row level security;
alter table public.contacts enable row level security;
alter table public.rate_limits enable row level security;
alter table public.dispatch_requests enable row level security;
alter table public.fitter_dashboards enable row level security;
-- No anonymous policies: the service-role key stays on the Next.js server.
create or replace function public.hit_rate_limit(p_key text,p_now bigint,p_expires bigint) returns integer language sql security definer set search_path=public as $$
 insert into rate_limits(key,count,expires) values(p_key,1,p_expires)
 on conflict(key) do update set count=case when rate_limits.expires<p_now then 1 else rate_limits.count+1 end,
 expires=case when rate_limits.expires<p_now then p_expires else rate_limits.expires end returning count;
$$;
revoke all on function public.hit_rate_limit(text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.hit_rate_limit(text,bigint,bigint) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('fitter-photos','fitter-photos',false,4194304,array['image/webp']) on conflict(id) do nothing;

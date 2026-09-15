-- Run after schema.sql. Public clients have no table access; the application
-- reads explicit public fields and authorizes mutations on the server.
create table if not exists public.community_posts (
  id text primary key,
  author_name text not null check (char_length(author_name) between 2 and 60),
  title text not null check (char_length(title) between 5 and 100),
  car_model text not null check (char_length(car_model) between 2 and 80),
  neighborhood text not null check (char_length(neighborhood) between 2 and 120),
  body text not null check (char_length(body) between 15 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  owner_hash text not null,
  created_at text not null
);
create index if not exists community_posts_created on public.community_posts(created_at desc);
create table if not exists public.community_replies (
  id text primary key,
  post_id text not null references public.community_posts(id) on delete cascade,
  fitter_id text not null references public.fitters(id) on delete cascade,
  body text not null check (char_length(body) between 5 and 1500),
  created_at text not null
);
create index if not exists community_replies_post on public.community_replies(post_id);
alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;
revoke all on public.community_posts, public.community_replies from anon, authenticated;
grant all on public.community_posts, public.community_replies to service_role;

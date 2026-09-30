-- Hand in Hand community — database schema for Supabase (Postgres).
-- Run once in the Supabase SQL editor (see docs/COMMUNITY_SETUP.md).
--
-- Security model
--  * Row Level Security on every table.
--  * Members can only edit their own content, and only the columns listed in
--    the GRANT statements. Points, levels, verification and moderator flags
--    change only through the SECURITY DEFINER functions below.
--  * Points are mostly given by *other* people's actions, with a daily cap.

create extension if not exists pgcrypto;

-- ───────────────────────── Profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  role text not null default 'parent' check (role in ('parent', 'teacher', 'specialist')),
  country text not null default 'US' check (country in ('US', 'CA', 'UK', 'AU', 'OTHER')),
  bio text not null default '' check (char_length(bio) <= 500),
  specialty text not null default '' check (char_length(specialty) <= 80),
  verified boolean not null default false,
  is_moderator boolean not null default false,
  is_admin boolean not null default false,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.level_for(p integer) returns text
language sql immutable as $$
  select case when p >= 1000 then 'Pillar' when p >= 500 then 'Mentor' when p >= 200 then 'Guide'
              when p >= 50 then 'Helper' else 'Seed' end
$$;

create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_moderator or is_admin from profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- ───────────────────────── Points ─────────────────────────
create table public.points_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  amount integer not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index on public.points_ledger (user_id, created_at desc);

-- Adds points (or removes them with a negative amount). Positive points from
-- community actions are capped at 100 per person per day.
create or replace function public.award(p_user uuid, p_amount integer, p_reason text, p_ref uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  today_total integer;
  amount integer := p_amount;
begin
  if p_user is null or amount = 0 then return; end if;
  if amount > 0 and p_reason <> 'admin' then
    select coalesce(sum(l.amount), 0) into today_total from points_ledger l
      where l.user_id = p_user and l.amount > 0 and l.reason <> 'admin' and l.created_at > now() - interval '1 day';
    amount := least(amount, greatest(0, 100 - today_total));
    if amount = 0 then return; end if;
  end if;
  insert into points_ledger (user_id, amount, reason, ref_id) values (p_user, amount, p_reason, p_ref);
  update profiles set points = greatest(0, points + amount) where id = p_user;
end $$;
revoke execute on function public.award(uuid, integer, text, uuid) from public, anon, authenticated;

-- ───────────────────────── Forum ─────────────────────────
create table public.groups (
  id text primary key,
  name text not null,
  description text not null default '',
  icon text not null default '💬',
  sort integer not null default 0
);

insert into public.groups (id, name, description, icon, sort) values
  ('welcome', 'Welcome & introductions', 'New here? Say hello.', '👋', 0),
  ('new-diagnosis', 'Just diagnosed', 'First steps, feelings and questions after a diagnosis.', '🌱', 1),
  ('school', 'School, IEPs & EHCPs', 'Plans, meetings, rights and working with school.', '🏫', 2),
  ('behavior', 'Behavior & meltdowns', 'What works, what doesn''t, and support on hard days.', '🌊', 3),
  ('communication', 'Speech & communication', 'Speech, AAC, signing and picture systems.', '💬', 4),
  ('sensory', 'Sensory & regulation', 'Noise, textures, movement and calming ideas.', '🎧', 5),
  ('daily-life', 'Sleep, food & daily life', 'Routines, eating, toileting, sleep and outings.', '🏡', 6),
  ('teachers', 'Teachers'' lounge', 'Classroom strategies and resources for educators.', '🍎', 7),
  ('teens', 'Teens & transition', 'Growing up, independence and life after school.', '🎓', 8),
  ('self-care', 'Caring for yourself', 'Parents and carers matter too.', '💛', 9);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  group_id text not null references public.groups,
  kind text not null default 'discussion' check (kind in ('discussion', 'question')),
  title text not null check (char_length(title) between 5 and 150),
  body text not null check (char_length(body) between 1 and 10000),
  accepted_reply_id uuid,
  reply_count integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.posts (group_id, created_at desc);
create index on public.posts (created_at desc);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  helpful_count integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.replies (post_id, created_at);

create table public.helpful_votes (
  reply_id uuid not null references public.replies on delete cascade,
  voter_id uuid not null default auth.uid() references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, voter_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles on delete cascade,
  post_id uuid references public.posts on delete cascade,
  reply_id uuid references public.replies on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  check (post_id is not null or reply_id is not null)
);

-- New reply: count it, and give a point (5 for a verified specialist answering a question).
create or replace function public.on_reply_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p posts%rowtype;
  specialist boolean;
begin
  select * into p from posts where id = new.post_id;
  update posts set reply_count = reply_count + 1 where id = new.post_id;
  if p.author_id <> new.author_id then
    select verified into specialist from profiles where id = new.author_id;
    if p.kind = 'question' and specialist then
      perform award(new.author_id, 5, 'specialist_answer', new.id);
    else
      perform award(new.author_id, 1, 'reply', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger reply_insert after insert on public.replies for each row execute function public.on_reply_insert();

create or replace function public.on_reply_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update posts set reply_count = greatest(0, reply_count - 1) where id = old.post_id;
  return old;
end $$;
create trigger reply_delete after delete on public.replies for each row execute function public.on_reply_delete();

-- Helpful votes: +2 to the reply's author (never for voting on yourself).
create or replace function public.on_vote() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  author uuid;
begin
  if tg_op = 'INSERT' then
    select author_id into author from replies where id = new.reply_id;
    if author = new.voter_id then raise exception 'You cannot vote for your own reply'; end if;
    update replies set helpful_count = helpful_count + 1 where id = new.reply_id;
    perform award(author, 2, 'helpful_vote', new.reply_id);
    return new;
  else
    select author_id into author from replies where id = old.reply_id;
    update replies set helpful_count = greatest(0, helpful_count - 1) where id = old.reply_id;
    perform award(author, -2, 'helpful_vote_removed', old.reply_id);
    return old;
  end if;
end $$;
create trigger vote_change after insert or delete on public.helpful_votes for each row execute function public.on_vote();

-- The person who asked marks the answer that helped most: +15 to its author.
create or replace function public.accept_answer(p_post uuid, p_reply uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  p posts%rowtype;
  r replies%rowtype;
begin
  select * into p from posts where id = p_post;
  select * into r from replies where id = p_reply and post_id = p_post;
  if p.id is null or r.id is null then raise exception 'Not found'; end if;
  if p.author_id <> auth.uid() then raise exception 'Only the person who asked can accept an answer'; end if;
  if p.accepted_reply_id is not null then raise exception 'An answer is already accepted'; end if;
  update posts set accepted_reply_id = p_reply where id = p_post;
  if r.author_id <> p.author_id then perform award(r.author_id, 15, 'accepted_answer', p_reply); end if;
end $$;

-- ───────────────────────── Template library ─────────────────────────
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  kind text not null check (kind in ('schedule', 'checklist', 'story', 'board')),
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  content jsonb not null check (pg_column_size(content) < 200000),
  import_count integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.template_imports (
  template_id uuid not null references public.templates on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (template_id, user_id)
);

create or replace function public.on_template_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform award(new.author_id, 3, 'template_shared', new.id);
  return new;
end $$;
create trigger template_insert after insert on public.templates for each row execute function public.on_template_insert();

-- Counts an import once per person; every 10 imports gives the author +5.
create or replace function public.record_template_import(p_template uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  t templates%rowtype;
begin
  select * into t from templates where id = p_template;
  if t.id is null then raise exception 'Not found'; end if;
  insert into template_imports (template_id, user_id) values (p_template, auth.uid()) on conflict do nothing;
  if found and t.author_id <> auth.uid() then
    update templates set import_count = import_count + 1 where id = p_template returning * into t;
    if t.import_count % 10 = 0 then perform award(t.author_id, 5, 'template_imports', p_template); end if;
  end if;
end $$;

-- ───────────────────────── Live sessions ─────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 240),
  link text not null default '' check (link = '' or link ~* '^https://'),
  completed boolean not null default false,
  hours numeric(5, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.event_rsvps (
  event_id uuid not null references public.events on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  primary key (event_id, user_id)
);

-- A moderator confirms a session took place: +50 and volunteer hours for the host.
create or replace function public.complete_event(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  e events%rowtype;
begin
  if not is_moderator() then raise exception 'Moderators only'; end if;
  update events set completed = true, hours = round(duration_minutes / 60.0, 2)
    where id = p_event and not completed returning * into e;
  if e.id is not null then perform award(e.host_id, 50, 'session_hosted', e.id); end if;
end $$;

-- ───────────────────────── Specialist verification ─────────────────────────
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  profession text not null check (char_length(profession) between 2 and 80),
  license_number text not null default '' check (char_length(license_number) <= 80),
  issuing_body text not null default '' check (char_length(issuing_body) <= 120),
  evidence_url text not null default '' check (evidence_url = '' or evidence_url ~* '^https://'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create or replace function public.review_verification(p_request uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  r verification_requests%rowtype;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update verification_requests set status = case when p_approve then 'approved' else 'rejected' end
    where id = p_request and status = 'pending' returning * into r;
  if r.id is not null and p_approve then
    update profiles set verified = true, role = 'specialist', specialty = r.profession where id = r.user_id;
  end if;
end $$;

-- ───────────────────────── Moderation ─────────────────────────
create or replace function public.resolve_report(p_report uuid, p_hide boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  r reports%rowtype;
begin
  if not is_moderator() then raise exception 'Moderators only'; end if;
  update reports set resolved = true where id = p_report returning * into r;
  if r.id is null then return; end if;
  if p_hide then
    if r.reply_id is not null then update replies set hidden = true where id = r.reply_id; end if;
    if r.post_id is not null then update posts set hidden = true where id = r.post_id; end if;
  end if;
  perform award(auth.uid(), 3, 'moderation', p_report);
end $$;

-- ───────────────────────── Stats and certificates ─────────────────────────
create or replace function public.user_stats(p_user uuid)
returns table (points integer, level text, answers bigint, accepted bigint, helpful bigint, posts bigint, templates bigint, sessions bigint, hours numeric)
language sql stable security definer set search_path = public as $$
  select pr.points, level_for(pr.points),
    (select count(*) from replies r where r.author_id = p_user and not r.hidden),
    (select count(*) from posts p join replies r on r.id = p.accepted_reply_id where r.author_id = p_user),
    (select coalesce(sum(r.helpful_count), 0) from replies r where r.author_id = p_user),
    (select count(*) from posts p where p.author_id = p_user and not p.hidden),
    (select count(*) from templates t where t.author_id = p_user and not t.hidden),
    (select count(*) from events e where e.host_id = p_user and e.completed),
    (select coalesce(sum(e.hours), 0) from events e where e.host_id = p_user and e.completed)
  from profiles pr where pr.id = p_user
$$;

create or replace function public.my_stats()
returns table (points integer, level text, answers bigint, accepted bigint, helpful bigint, posts bigint, templates bigint, sessions bigint, hours numeric)
language sql stable security definer set search_path = public as $$
  select * from user_stats(auth.uid())
$$;

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(encode(gen_random_bytes(5), 'hex')),
  user_id uuid not null references public.profiles on delete cascade,
  display_name text not null,
  role text not null,
  specialty text not null default '',
  verified boolean not null default false,
  level text not null,
  points integer not null,
  answers integer not null,
  accepted integer not null,
  helpful integer not null,
  templates integer not null,
  sessions integer not null,
  hours numeric(7, 2) not null,
  issued_at timestamptz not null default now()
);

-- Issues a contribution certificate (Helper level and up, at most one per 30 days).
create or replace function public.issue_certificate() returns public.certificates
language plpgsql security definer set search_path = public as $$
declare
  pr profiles%rowtype;
  s record;
  c certificates%rowtype;
begin
  select * into pr from profiles where id = auth.uid();
  if pr.id is null then raise exception 'Create your community profile first'; end if;
  if pr.points < 50 then raise exception 'Certificates start at the Helper level (50 points)'; end if;
  if exists (select 1 from certificates where user_id = pr.id and issued_at > now() - interval '30 days') then
    raise exception 'You can get a new certificate 30 days after the last one';
  end if;
  select * into s from user_stats(pr.id);
  insert into certificates (user_id, display_name, role, specialty, verified, level, points, answers, accepted, helpful, templates, sessions, hours)
    values (pr.id, pr.display_name, pr.role, pr.specialty, pr.verified, s.level, s.points, s.answers, s.accepted, s.helpful, s.templates, s.sessions, s.hours)
    returning * into c;
  return c;
end $$;

-- Public check used by the verification web page (works without signing in).
create or replace function public.verify_certificate(p_code text)
returns table (code text, display_name text, role text, specialty text, verified boolean, level text, points integer,
               answers integer, accepted integer, helpful integer, templates integer, sessions integer, hours numeric, issued_at timestamptz)
language sql stable security definer set search_path = public as $$
  select code, display_name, role, specialty, verified, level, points, answers, accepted, helpful, templates, sessions, hours, issued_at
  from certificates where code = upper(trim(p_code))
$$;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.points_ledger enable row level security;
alter table public.groups enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;
alter table public.helpful_votes enable row level security;
alter table public.reports enable row level security;
alter table public.templates enable row level security;
alter table public.template_imports enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.verification_requests enable row level security;
alter table public.certificates enable row level security;

create policy "members see profiles" on public.profiles for select to authenticated using (true);
create policy "create own profile" on public.profiles for insert to authenticated with check (id = auth.uid() and points = 0 and not verified and not is_moderator and not is_admin);
create policy "edit own profile" on public.profiles for update to authenticated using (id = auth.uid());

create policy "see own points" on public.points_ledger for select to authenticated using (user_id = auth.uid());

create policy "anyone sees groups" on public.groups for select using (true);

create policy "members read posts" on public.posts for select to authenticated using (not hidden or author_id = auth.uid() or is_moderator());
create policy "members write posts" on public.posts for insert to authenticated with check (author_id = auth.uid() and accepted_reply_id is null and reply_count = 0 and not hidden);
create policy "edit own posts" on public.posts for update to authenticated using (author_id = auth.uid());
create policy "delete own posts" on public.posts for delete to authenticated using (author_id = auth.uid() or is_moderator());

create policy "members read replies" on public.replies for select to authenticated using (not hidden or author_id = auth.uid() or is_moderator());
create policy "members write replies" on public.replies for insert to authenticated with check (author_id = auth.uid() and helpful_count = 0 and not hidden);
create policy "edit own replies" on public.replies for update to authenticated using (author_id = auth.uid());
create policy "delete own replies" on public.replies for delete to authenticated using (author_id = auth.uid() or is_moderator());

create policy "members see votes" on public.helpful_votes for select to authenticated using (true);
create policy "vote as yourself" on public.helpful_votes for insert to authenticated with check (voter_id = auth.uid());
create policy "remove own vote" on public.helpful_votes for delete to authenticated using (voter_id = auth.uid());

create policy "report as yourself" on public.reports for insert to authenticated with check (reporter_id = auth.uid() and not resolved);
create policy "moderators see reports" on public.reports for select to authenticated using (is_moderator());

create policy "members read templates" on public.templates for select to authenticated using (not hidden or author_id = auth.uid());
create policy "share templates" on public.templates for insert to authenticated with check (author_id = auth.uid() and import_count = 0 and not hidden);
create policy "delete own templates" on public.templates for delete to authenticated using (author_id = auth.uid() or is_moderator());
create policy "see own imports" on public.template_imports for select to authenticated using (user_id = auth.uid());

create policy "members see events" on public.events for select to authenticated using (true);
create policy "guides and specialists host" on public.events for insert to authenticated with check (
  host_id = auth.uid() and not completed and hours = 0
  and exists (select 1 from profiles where id = auth.uid() and (verified or points >= 200)));
create policy "edit own events" on public.events for update to authenticated using (host_id = auth.uid());
create policy "delete own events" on public.events for delete to authenticated using (host_id = auth.uid() or is_moderator());
create policy "members see rsvps" on public.event_rsvps for select to authenticated using (true);
create policy "rsvp as yourself" on public.event_rsvps for insert to authenticated with check (user_id = auth.uid());
create policy "cancel own rsvp" on public.event_rsvps for delete to authenticated using (user_id = auth.uid());

create policy "request verification" on public.verification_requests for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy "see own or all as admin" on public.verification_requests for select to authenticated using (user_id = auth.uid() or is_admin());

create policy "see own certificates" on public.certificates for select to authenticated using (user_id = auth.uid());

-- Column-level rights: members can only change these columns directly.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, display_name, role, country, bio, specialty) on public.profiles to authenticated;
grant update (display_name, role, country, bio, specialty) on public.profiles to authenticated;
revoke update on public.posts, public.replies, public.events from anon, authenticated;
grant update (title, body) on public.posts to authenticated;
grant update (body) on public.replies to authenticated;
grant update (title, description, starts_at, duration_minutes, link) on public.events to authenticated;
revoke all on public.certificates, public.points_ledger from anon;
revoke insert, update, delete on public.certificates, public.points_ledger from authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
revoke execute on function public.user_stats(uuid) from anon;

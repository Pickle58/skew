-- Skew database schema. Source of truth for the skew_news Supabase project.
-- Safe to re-run: every statement is idempotent.
-- All access goes through the service role on the server; anon/authenticated have no privileges.

create extension if not exists vector with schema extensions;

-- Shared ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- sources --------------------------------------------------------------------

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  listing_url text not null unique check (listing_url ~ '^https?://'),
  parser_strategy text not null default 'generic',
  is_active boolean not null default true,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sources_active_idx on public.sources (is_active) where is_active;

create or replace trigger sources_set_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

-- articles -------------------------------------------------------------------

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete restrict,
  original_url text not null unique,
  canonical_url text unique,
  title text not null check (length(btrim(title)) > 0),
  image_url text not null,
  published_at timestamptz not null,
  raw_text text not null,
  scraped_at timestamptz not null default now(),
  analyzed_at timestamptz,
  analysis_attempt_count integer not null default 0
    check (analysis_attempt_count >= 0),
  analysis_last_error text,
  analysis_abandoned_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.articles
  add column if not exists analysis_attempt_count integer not null default 0;
alter table public.articles
  add column if not exists analysis_last_error text;
alter table public.articles
  add column if not exists analysis_abandoned_at timestamptz;

create index if not exists articles_source_id_idx on public.articles (source_id);
create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_analyzed_at_idx on public.articles (analyzed_at desc)
  where analyzed_at is not null;
create index if not exists articles_analysis_abandoned_at_idx on public.articles (analysis_abandoned_at)
  where analysis_abandoned_at is not null;

-- article_analyses -----------------------------------------------------------

create table if not exists public.article_analyses (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique references public.articles (id) on delete cascade,
  summary text not null,
  sentiment_score real not null check (sentiment_score between -1 and 1),
  sentiment_label text not null check (sentiment_label in ('positive', 'neutral', 'negative')),
  bias_label text not null check (bias_label in ('left', 'center', 'right', 'mixed', 'unclear')),
  left_percentage smallint not null check (left_percentage between 0 and 100),
  center_percentage smallint not null check (center_percentage between 0 and 100),
  right_percentage smallint not null check (right_percentage between 0 and 100),
  bias_score numeric(4, 3) generated always as ((right_percentage - left_percentage) / 100.0) stored,
  confidence real not null check (confidence between 0 and 1),
  framing_notes text[] not null default '{}',
  loaded_terms text[] not null default '{}',
  disclaimer text not null,
  model text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  constraint article_analyses_percentages_sum check (
    left_percentage + center_percentage + right_percentage = 100
  )
);

alter table public.article_analyses
  add column if not exists embedding extensions.vector(1536);

-- IVFFlat needs at least one row. lists ≈ sqrt(n), capped for small corpora.
-- Rebuild after large embedding backfills so lists stays appropriate.
do $$
declare
  row_count integer;
  list_count integer;
begin
  if to_regclass('public.article_analyses_embedding_idx') is null then
    select count(*)::integer into row_count from public.article_analyses where embedding is not null;
    if row_count >= 1 then
      list_count := greatest(1, least(100, ceil(sqrt(row_count))::integer));
      execute format(
        'create index article_analyses_embedding_idx on public.article_analyses using ivfflat (embedding vector_cosine_ops) with (lists = %s)',
        list_count
      );
    end if;
  end if;
end
$$;

create or replace function public.repair_analyzed_at_orphans()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  repaired integer;
begin
  with updated as (
    update public.articles as a
    set analyzed_at = now()
    from public.article_analyses as aa
    where aa.article_id = a.id
      and a.analyzed_at is null
      and aa.embedding is not null
    returning a.id
  )
  select count(*)::integer into repaired from updated;
  return repaired;
end;
$$;

revoke all on function public.repair_analyzed_at_orphans() from public, anon, authenticated;
grant execute on function public.repair_analyzed_at_orphans() to service_role;

create or replace function public.match_related_articles(
  query_embedding extensions.vector(1536),
  exclude_article_id uuid,
  match_count integer
)
returns table (
  id uuid,
  title text,
  image_url text,
  published_at timestamptz,
  source_name text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    a.id,
    a.title,
    a.image_url,
    a.published_at,
    s.name as source_name
  from public.article_analyses as aa
  join public.articles as a on a.id = aa.article_id
  join public.sources as s on s.id = a.source_id
  where aa.embedding is not null
    and a.analyzed_at is not null
    and a.id <> exclude_article_id
  order by aa.embedding <=> query_embedding
  limit least(match_count, 5);
$$;

revoke all on function public.match_related_articles(extensions.vector, uuid, integer) from public, anon, authenticated;
grant execute on function public.match_related_articles(extensions.vector, uuid, integer) to service_role;

-- logs -----------------------------------------------------------------------

create table if not exists public.logs (
  id bigint generated always as identity primary key,
  level text not null check (level in ('info', 'warn', 'error')),
  scope text not null check (scope in ('scrape', 'analyze', 'scheduler', 'cron')),
  message text not null,
  context jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists logs_created_at_idx on public.logs (created_at desc);
create index if not exists logs_scope_created_at_idx on public.logs (scope, created_at desc);

-- pipeline_locks -------------------------------------------------------------

create table if not exists public.pipeline_locks (
  key text primary key check (key in ('cron', 'scrape', 'analyze')),
  holder text not null,
  expires_at timestamptz not null
);

create or replace function public.try_acquire_pipeline_lock(
  p_key text,
  p_holder text,
  p_ttl_ms integer
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  expires timestamptz := now_ts + make_interval(secs => p_ttl_ms::double precision / 1000.0);
  conflicting boolean;
  existing_holder text;
  existing_expires timestamptz;
begin
  if p_key is null or p_key not in ('cron', 'scrape', 'analyze') then
    raise exception 'invalid pipeline lock key: %', p_key;
  end if;
  if p_holder is null or length(p_holder) = 0 then
    raise exception 'pipeline lock holder is required';
  end if;
  if p_ttl_ms is null or p_ttl_ms <= 0 then
    raise exception 'pipeline lock ttl_ms must be positive';
  end if;

  lock table public.pipeline_locks in exclusive mode;

  if p_key = 'cron' then
    select exists(
      select 1
      from public.pipeline_locks
      where key in ('scrape', 'analyze')
        and expires_at > now_ts
    ) into conflicting;
  else
    select exists(
      select 1
      from public.pipeline_locks
      where key = 'cron'
        and expires_at > now_ts
    ) into conflicting;
  end if;

  if conflicting then
    return false;
  end if;

  select holder, expires_at
  into existing_holder, existing_expires
  from public.pipeline_locks
  where key = p_key;

  if found then
    if existing_expires > now_ts then
      return false;
    end if;
    update public.pipeline_locks
    set holder = p_holder,
        expires_at = expires
    where key = p_key;
  else
    insert into public.pipeline_locks (key, holder, expires_at)
    values (p_key, p_holder, expires);
  end if;

  return true;
end;
$$;

revoke all on function public.try_acquire_pipeline_lock(text, text, integer) from public, anon, authenticated;
grant execute on function public.try_acquire_pipeline_lock(text, text, integer) to service_role;

-- oxylabs_schedules ----------------------------------------------------------

create table if not exists public.oxylabs_schedules (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null unique references public.sources (id) on delete cascade,
  schedule_id text not null unique check (schedule_id ~ '^[0-9]+$'),
  cron_expression text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger oxylabs_schedules_set_updated_at
  before update on public.oxylabs_schedules
  for each row execute function public.set_updated_at();

-- oxylabs_schedule_runs ------------------------------------------------------

create table if not exists public.oxylabs_schedule_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id text not null references public.oxylabs_schedules (schedule_id) on delete cascade,
  oxylabs_run_id text,
  oxylabs_job_id text not null unique check (oxylabs_job_id ~ '^[0-9]+$'),
  result_status text not null,
  processed_at timestamptz,
  summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists oxylabs_schedule_runs_schedule_created_idx
  on public.oxylabs_schedule_runs (schedule_id, created_at desc);

-- Security -------------------------------------------------------------------
-- RLS on with no policies; service_role bypasses RLS. Public roles get nothing.

alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.article_analyses enable row level security;
alter table public.logs enable row level security;
alter table public.pipeline_locks enable row level security;
alter table public.oxylabs_schedules enable row level security;
alter table public.oxylabs_schedule_runs enable row level security;

revoke all on table public.sources from anon, authenticated;
revoke all on table public.articles from anon, authenticated;
revoke all on table public.article_analyses from anon, authenticated;
revoke all on table public.logs from anon, authenticated;
revoke all on table public.pipeline_locks from anon, authenticated;
revoke all on table public.oxylabs_schedules from anon, authenticated;
revoke all on table public.oxylabs_schedule_runs from anon, authenticated;

revoke all on sequence public.logs_id_seq from anon, authenticated;

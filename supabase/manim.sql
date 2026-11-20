-- Черга відео Manim: кабінет (з будь-якого пристрою) кладе сюди код сцени,
-- програма на ноутбуці репетитора (tools/manim-worker) забирає, рендерить і
-- кладе відео в сховище boards — кабінет ставить його на дошку.
-- Кожен бачить і змінює лише свої завдання (RLS).

create table if not exists public.manim_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null default '',
  code       text not null check (length(code) <= 60000),
  quality    text not null default 'm' check (quality in ('l', 'm', 'h')),
  status     text not null default 'queued' check (status in ('queued', 'rendering', 'done', 'error')),
  video_key  text,
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manim_jobs_queue on public.manim_jobs (user_id, status, created_at);

alter table public.manim_jobs enable row level security;

drop policy if exists "manim_jobs own" on public.manim_jobs;
create policy "manim_jobs own" on public.manim_jobs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.manim_jobs to authenticated;

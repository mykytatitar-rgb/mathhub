-- Відвідування дошки: хто (репетитор чи учень), коли зайшов і скільки пробув.
-- Пише сторінка уроку (share/engine/visits.js) раз на хвилину, поки дошка
-- на екрані: учень — за посиланням на урок, репетитор — під своїм входом.
-- Читати може лише репетитор, і лише своє (RLS). Писати напряму не може
-- ніхто — тільки через visit_beat, яка сама визначає власника й урок.

create table if not exists public.board_visits (
  id         uuid        primary key,
  owner      uuid        not null references auth.users (id) on delete cascade,
  lesson_id  text        not null,
  who        text        not null check (who in ('tutor', 'student')),
  device     text        not null default '',
  started_at timestamptz not null default now(),
  last_at    timestamptz not null default now()
);

create index if not exists board_visits_owner_time on public.board_visits (owner, started_at desc);

alter table public.board_visits enable row level security;

drop policy if exists "board_visits read own" on public.board_visits;
create policy "board_visits read own" on public.board_visits
  for select to authenticated
  using (auth.uid() = owner);

revoke all on public.board_visits from anon, authenticated;
grant select on public.board_visits to authenticated;


/**
 * Позначка «ще тут». З p_token — учень за посиланням на урок; без нього —
 * репетитор під своїм входом (p_lesson — його урок). Повторний виклик з
 * тим самим p_visit лише посуває last_at; чужий візит змінити не можна.
 */
create or replace function public.visit_beat(
  p_visit  uuid,
  p_token  text default null,
  p_lesson text default null,
  p_device text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o uuid;
  l text;
  w text;
begin
  if p_token is not null then
    select sh.owner, sh.lesson_id into o, l
      from public.shares sh where sh.token = p_token and not sh.revoked;
    if not found then
      raise exception 'Посилання недійсне';
    end if;
    w := 'student';
  else
    o := auth.uid();
    l := p_lesson;
    w := 'tutor';
    if o is null or l is null or length(l) > 80 then
      raise exception 'Немає входу';
    end if;
  end if;

  insert into public.board_visits (id, owner, lesson_id, who, device)
  values (p_visit, o, l, w, left(coalesce(p_device, ''), 40))
  on conflict (id) do update set last_at = now()
    where board_visits.owner = o and board_visits.lesson_id = l and board_visits.who = w
      and board_visits.last_at > now() - interval '12 hours';
end;
$$;

revoke all on function public.visit_beat(uuid, text, text, text) from public;
grant execute on function public.visit_beat(uuid, text, text, text) to anon, authenticated;

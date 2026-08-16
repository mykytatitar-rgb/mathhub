/* ============================================================
   Нагадування в Telegram
   ============================================================

   Окремим файлом, а не в schema.sql, з однієї причини: цей запускають
   ОДИН раз і руками, бо в ньому ваш токен бота. Основну схему можна
   виконувати скільки завгодно й показувати кому завгодно, цю — ні.

   Чому все в базі, а не окремою програмою. Щоб надсилати повідомлення,
   комусь треба прокидатися за розкладом. Найпростіший варіант — щоб це
   робила сама база: pg_cron будить, pg_net стукає в Telegram. Не треба ні
   сервера, ні окремого розгортання, ні ще одного місця, яке може впасти.

   Токен лежить у таблиці, до якої немає жодного правила доступу. Це не
   недогляд: без політики PostgREST не віддасть звідти нічого навіть вам із
   вашим ключем. Читають його тільки функції, позначені security definer. */


/* ------------------------------------------------------------
   1. Розширення
   ------------------------------------------------------------
   Якщо тут буде помилка «permission denied» — увімкніть їх мишкою:
   Database → Extensions → знайти pg_cron і pg_net → Enable. */

create extension if not exists pg_cron;
create extension if not exists pg_net;


/* ------------------------------------------------------------
   2. Таємниця
   ------------------------------------------------------------ */

create table if not exists public.tg_secret (
  id    int  primary key default 1,
  token text not null,
  check (id = 1)
);

alter table public.tg_secret enable row level security;
-- жодної політики навмисно: назовні ця таблиця не існує


/* ------------------------------------------------------------
   3. Кому й коли писати
   ------------------------------------------------------------ */

create table if not exists public.tg_config (
  owner       uuid    primary key references auth.users(id) on delete cascade,
  chat_id     bigint  not null,           -- ваш особистий чат із ботом
  enabled     boolean not null default true,
  hours_ahead int     not null default 12, -- за скільки годин попереджати про урок
  daily_at    int     not null default 20, -- о котрій (за Києвом) слати підсумок дня
  tz          text    not null default 'Europe/Kyiv'
);

alter table public.tg_config enable row level security;

drop policy if exists tg_config_own on public.tg_config;
create policy tg_config_own on public.tg_config
  for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());


/* Черга повідомлень.

   Не шлемо одразу з того місця, де щось сталося: мережа може не відповісти,
   і тоді або губиться повідомлення, або зависає те, що його породило. Черга
   ще й рятує від дублів — на пару «урок + привід» стоїть унікальність. */
create table if not exists public.tg_outbox (
  id      bigserial   primary key,
  owner   uuid        not null references auth.users(id) on delete cascade,
  chat_id bigint      not null,
  body    text        not null,
  tag     text,                          -- ознака привода, щоб не слати двічі
  made_at timestamptz not null default now(),
  sent_at timestamptz,
  error   text
);

create unique index if not exists tg_outbox_once on public.tg_outbox (owner, tag) where tag is not null;
create index if not exists tg_outbox_todo on public.tg_outbox (sent_at) where sent_at is null;

alter table public.tg_outbox enable row level security;

drop policy if exists tg_outbox_own on public.tg_outbox;
create policy tg_outbox_own on public.tg_outbox
  for select to authenticated using (owner = auth.uid());


/* ------------------------------------------------------------
   4. Відправлення
   ------------------------------------------------------------ */

/**
 * Витягти з черги все невідправлене й віддати Telegram.
 *
 * pg_net працює асинхронно: він приймає запит і відповідає пізніше. Нам
 * цього досить — позначаємо відправленим одразу, а якщо не дійшло, наступне
 * нагадування все одно прийде. Гнатися за підтвердженням тут дорожче, ніж
 * втратити одне повідомлення.
 */
create or replace function public.tg_flush()
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  tok text;
  r   record;
  n   int := 0;
begin
  select token into tok from public.tg_secret where id = 1;
  if tok is null then return 0; end if;

  for r in
    select * from public.tg_outbox where sent_at is null order by id limit 30
  loop
    perform net.http_post(
      url     := 'https://api.telegram.org/bot' || tok || '/sendMessage',
      body    := jsonb_build_object('chat_id', r.chat_id, 'text', r.body,
                                    'parse_mode', 'HTML',
                                    'disable_web_page_preview', true),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
    update public.tg_outbox set sent_at = now() where id = r.id;
    n := n + 1;
  end loop;

  return n;
end;
$$;


/* ------------------------------------------------------------
   5. Що саме нагадувати
   ------------------------------------------------------------ */

/**
 * Уроки, які скоро почнуться, — по одному повідомленню на урок.
 *
 * Уроки лежать у records як jsonb, тож дату дістаємо з поля data. Скасовані
 * й перенесені пропускаємо: нагадувати про них — гірше, ніж мовчати.
 */
create or replace function public.tg_queue_lessons()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  l record;
  n int := 0;
begin
  for c in select * from public.tg_config where enabled loop
    for l in
      select r.id,
             (r.data->>'date')::timestamptz as at,
             r.data->>'topic'               as topic,
             r.data->>'studentId'           as student_id
        from public.records r
       where r.owner = c.owner and r.kind = 'lessons' and not r.deleted
         and coalesce(r.data->>'status', 'planned') = 'planned'
         and (r.data->>'date')::timestamptz between now()
             and now() + make_interval(hours => c.hours_ahead)
    loop
      insert into public.tg_outbox (owner, chat_id, body, tag)
      select c.owner, c.chat_id,
             '<b>Скоро урок</b>' || E'\n' ||
             coalesce((select s.data->>'name' from public.records s
                        where s.owner = c.owner and s.kind = 'students'
                          and s.id = l.student_id and not s.deleted), 'учень') ||
             ' · ' || to_char(l.at at time zone c.tz, 'DD.MM о HH24:MI') ||
             case when l.topic is null or l.topic = '' then ''
                  else E'\n' || l.topic end,
             'lesson:' || l.id
      on conflict do nothing;

      if found then n := n + 1; end if;
    end loop;
  end loop;

  return n;
end;
$$;

/** Підсумок дня: скільки уроків завтра й хто винен. */
create or replace function public.tg_queue_daily()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  cnt int;
  n int := 0;
  day date;
begin
  for c in select * from public.tg_config where enabled loop
    -- шлемо лише в потрібну годину за місцевим часом
    continue when extract(hour from (now() at time zone c.tz))::int <> c.daily_at;

    day := ((now() at time zone c.tz) + interval '1 day')::date;

    select count(*) into cnt
      from public.records r
     where r.owner = c.owner and r.kind = 'lessons' and not r.deleted
       and coalesce(r.data->>'status', 'planned') = 'planned'
       and ((r.data->>'date')::timestamptz at time zone c.tz)::date = day;

    insert into public.tg_outbox (owner, chat_id, body, tag)
    values (c.owner, c.chat_id,
            '<b>Завтра</b>' || E'\n' ||
            case when cnt = 0 then 'уроків немає'
                 else cnt || ' ' || case when cnt = 1 then 'урок'
                                         when cnt between 2 and 4 then 'уроки'
                                         else 'уроків' end end,
            'daily:' || day)
    on conflict do nothing;

    if found then n := n + 1; end if;
  end loop;

  return n;
end;
$$;


/* ------------------------------------------------------------
   6. Пробне повідомлення — з самої програми
   ------------------------------------------------------------ */

create or replace function public.tg_test()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  if auth.uid() is null then
    raise exception 'Потрібен вхід';
  end if;

  select * into c from public.tg_config where owner = auth.uid();
  if not found then
    return 'не налаштовано';
  end if;

  insert into public.tg_outbox (owner, chat_id, body, tag)
  values (c.owner, c.chat_id,
          '<b>Вектор</b>' || E'\n' || 'Нагадування працюють.',
          'test:' || to_char(now(), 'YYYYMMDDHH24MISS'));

  perform public.tg_flush();
  return 'надіслано';
end;
$$;

/** Чи налаштовані нагадування — для панелі в Налаштуваннях. */
create or replace function public.tg_status()
returns table (enabled boolean, hours_ahead int, daily_at int, queued int, sent int)
language sql
security definer
set search_path = public
as $$
  select c.enabled, c.hours_ahead, c.daily_at,
         (select count(*)::int from public.tg_outbox o
           where o.owner = c.owner and o.sent_at is null),
         (select count(*)::int from public.tg_outbox o
           where o.owner = c.owner and o.sent_at is not null)
    from public.tg_config c
   where c.owner = auth.uid();
$$;

revoke all on function public.tg_test()   from public;
revoke all on function public.tg_status() from public;
grant execute on function public.tg_test()   to authenticated;
grant execute on function public.tg_status() to authenticated;


/* ------------------------------------------------------------
   7. Розклад
   ------------------------------------------------------------
   Раз на чверть години: зібрати привід і відправити те, що зібралося. */

select cron.unschedule('tg-queue') where exists (select 1 from cron.job where jobname = 'tg-queue');
select cron.unschedule('tg-send')  where exists (select 1 from cron.job where jobname = 'tg-send');

select cron.schedule('tg-queue', '*/15 * * * *',
  $j$ select public.tg_queue_lessons(); select public.tg_queue_daily(); $j$);

select cron.schedule('tg-send', '*/5 * * * *',
  $j$ select public.tg_flush(); $j$);

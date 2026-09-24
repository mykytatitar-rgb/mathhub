-- mathhub: схема бази для Supabase.
-- Вставити цілком у Supabase → SQL Editor → Run. Виконувати можна повторно:
-- усе створюється через "if not exists", наявні дані не чіпаються.
--
-- Задум навмисно простий. Уся база програми зберігається одним JSON-документом
-- у таблиці state (один рядок). Так вийшло не з ліні, а тому що документ фізично
-- не може бути великим: у браузері він живе в localStorage, а той обмежений ~5 МБ.
-- Отже порядкове злиття таблиць тут не дало б нічого, крім складності й нових помилок.
--
-- Історія змін пишеться автоматично в snapshots — це і є резервні копії,
-- які більше не треба робити руками.

-- ============================================================
-- Поточний стан
-- ============================================================

create table if not exists public.state (
  id         text        not null default 'main',
  owner      uuid        not null references auth.users (id) on delete cascade,
  rev        bigint      not null default 0,   -- лічильник версій, захист від перезапису
  data       text        not null,             -- JSON бази програми
  device     text,                             -- хто зберіг останнім (для підказки в інтерфейсі)
  updated_at timestamptz not null default now(),
  -- ключ саме складений: якби він був лише по id, у всій базі існував би
  -- один-єдиний рядок 'main' на всіх користувачів разом
  primary key (owner, id)
);

-- ============================================================
-- Автоматична історія (резервні копії)
-- ============================================================

create table if not exists public.snapshots (
  id         bigserial   primary key,
  owner      uuid        not null references auth.users (id) on delete cascade,
  rev        bigint      not null,
  data       text        not null,
  device     text,
  created_at timestamptz not null default now()
);

create index if not exists snapshots_owner_created_idx
  on public.snapshots (owner, created_at desc);

-- Скільки версій тримаємо. 50 — це кілька тижнів звичайної роботи.
create or replace function public.trim_snapshots(p_owner uuid, p_keep int default 50)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.snapshots
  where owner = p_owner
    and id not in (
      select id from public.snapshots
      where owner = p_owner
      order by created_at desc
      limit p_keep
    );
end;
$$;

-- Перед кожним перезаписом стану кладемо попередню версію в історію.
create or replace function public.state_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
begin
  -- порожні й незмінені версії в історію не пишемо
  if old.data is not null and old.data <> new.data then
    select max(created_at) into v_last from public.snapshots where owner = old.owner;

    /* Під час уроку зміни йдуть щосекунди. Якби ми зберігали версію на кожну
       з них, 50 збережених версій покривали б хвилину роботи замість кількох
       тижнів — і як страховка вони були б марні. Тому не частіше ніж раз
       на 5 хвилин. */
    if v_last is null or v_last < now() - interval '5 minutes' then
      insert into public.snapshots (owner, rev, data, device)
      values (old.owner, old.rev, old.data, old.device);
      perform public.trim_snapshots(old.owner);
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists state_archive_trg on public.state;
create trigger state_archive_trg
  before update on public.state
  for each row execute function public.state_archive();

-- ============================================================
-- Доступ: кожен бачить лише свої рядки
-- ============================================================

alter table public.state     enable row level security;
alter table public.snapshots enable row level security;

-- Права навмисно мінімальні: з браузера дозволено ТІЛЬКИ читання.
-- Усі записи йдуть через функцію save_state, тому insert/update/delete
-- клієнтові не потрібні взагалі. Навіть якщо ключ колись витече,
-- зіпсувати чи видалити дані ним не вийде.
--
-- Ці grant'и потрібні, якщо при створенні проєкту вимкнено
-- "Automatically expose new tables" (а вимкнути його варто).
-- Якщо увімкнено — команди просто нічого не змінять.
grant usage on schema public to anon, authenticated;
grant select on public.state     to authenticated;
grant select on public.snapshots to authenticated;

revoke insert, update, delete on public.state     from anon, authenticated;
revoke insert, update, delete on public.snapshots from anon, authenticated;

-- Рядки видно лише власникові. Історію не можна ні переписати, ні підчистити:
-- резервна копія, яку можна змінити, не була б резервною копією.
drop policy if exists state_own       on public.state;
drop policy if exists snapshots_read  on public.snapshots;
drop policy if exists snapshots_insert on public.snapshots;
drop policy if exists snapshots_delete on public.snapshots;

create policy state_own on public.state
  for select using (auth.uid() = owner);

create policy snapshots_read on public.snapshots
  for select using (auth.uid() = owner);


-- Postgres за замовчуванням дозволяє викликати функції всім. Для save_state це
-- безпечно (вона сама бере власника з auth.uid()), а от trim_snapshots приймає
-- власника аргументом і працює з правами власника схеми — тому доступ до неї
-- і до тригерної функції треба відібрати, інакше нею можна було б повидаляти
-- чужі резервні копії.
revoke all on function public.trim_snapshots(uuid, int) from public, anon, authenticated;
revoke all on function public.state_archive()              from public, anon, authenticated;

-- сама save_state створюється нижче, у розділі про запобіжник від затирання

-- ============================================================
-- Сховище картинок дошок
-- ============================================================
--
-- Картинки не влазять у JSON-документ (він живе в localStorage з межею ~5 МБ),
-- тому лежать окремо. Шлях до файлу: <id користувача>/<ключ картинки> —
-- перший сегмент і є перепусткою: правила пускають лише до своєї теки.

insert into storage.buckets (id, name, public)
values ('boards', 'boards', false)
on conflict (id) do nothing;

drop policy if exists boards_read   on storage.objects;
drop policy if exists boards_write  on storage.objects;
drop policy if exists boards_update on storage.objects;
drop policy if exists boards_delete on storage.objects;

create policy boards_read on storage.objects
  for select using (
    bucket_id = 'boards' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy boards_write on storage.objects
  for insert with check (
    bucket_id = 'boards' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- потрібне для перезапису тим самим ключем (x-upsert)
create policy boards_update on storage.objects
  for update using (
    bucket_id = 'boards' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy boards_delete on storage.objects
  for delete using (
    bucket_id = 'boards' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Опубліковані уроки для учнів
-- ============================================================
--
-- Кошик навмисно публічний: учень відкриває посилання без жодного входу.
-- Захист тримається на самій адресі — у ній випадковий код на 128 бітів,
-- підібрати його неможливо. Відкликати доступ = видалити файл.
--
-- Класти й видаляти може лише власник, у свою теку. Шлях:
--   <id репетитора>/<код>/index.html
-- Учень бачить рівно один урок: це самодостатній HTML, у якому вже вшито
-- слайди й картинки саме цього заняття. Доступу до бази він не отримує зовсім.

insert into storage.buckets (id, name, public)
values ('shares', 'shares', true)
on conflict (id) do update set public = true;

drop policy if exists shares_read   on storage.objects;
drop policy if exists shares_write  on storage.objects;
drop policy if exists shares_update on storage.objects;
drop policy if exists shares_delete on storage.objects;

/* Читати файли учень може й без цього правила: кошик публічний, і файл за
   прямою адресою віддається всім. Правило потрібне лише для переліку
   файлів — а перелік виказав би коди всіх уроків разом. Тому переглядати
   список може тільки власник, у своїй теці (це ж потрібно для перезапису). */
create policy shares_read on storage.objects
  for select using (
    bucket_id = 'shares' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy shares_write on storage.objects
  for insert with check (
    bucket_id = 'shares' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy shares_update on storage.objects
  for update using (
    bucket_id = 'shares' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy shares_delete on storage.objects
  for delete using (
    bucket_id = 'shares' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Жива дошка для учня: читання, письмо, домашні завдання
-- ============================================================
--
-- Досі учень отримував знімок уроку — готову сторінку у сховищі. Через це
-- він не бачив змін одразу й не міг нічого написати: зв'язку з базою не було.
--
-- Тепер зв'язок є, але суворо обмежений. Учень не звертається до таблиць
-- напряму: усе йде через три функції нижче, і кожна перевіряє код доступу.
-- Знати код — це право на ОДИН урок, і ні на що більше.

create table if not exists public.shares (
  token      text        primary key,
  owner      uuid        not null references auth.users (id) on delete cascade,
  lesson_id  text        not null,
  title      text,
  can_write  boolean     not null default true,   -- чи дозволено учневі писати
  revoked    boolean     not null default false,
  data       text,                                -- поточний вигляд уроку для учня
  rev        bigint      not null default 0,       -- щоб учень тягнув дані лише коли є зміни
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists shares_owner_idx on public.shares (owner);

/* Написане учнем лежить ОКРЕМО від документа репетитора.
   Це принципово: база репетитора зберігається одним документом цілком,
   тому будь-яке його збереження затерло б записи учня, якби вони лежали там.
   Репетитор забирає ці внески й вливає їх у дошку в себе. */
create table if not exists public.share_contributions (
  id         bigserial   primary key,
  token      text        not null references public.shares (token) on delete cascade,
  kind       text        not null,   -- 'ink' — записи на дошці, 'homework' — фото рішень
  payload    text        not null,   -- JSON
  merged     boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contrib_token_idx on public.share_contributions (token, id);

alter table public.shares              enable row level security;
alter table public.share_contributions enable row level security;

-- Прямого доступу до таблиць немає ні в кого, крім власника: учень працює
-- лише через функції, які самі перевіряють код.
grant select on public.shares              to authenticated;
grant select on public.share_contributions to authenticated;
revoke all on public.shares              from anon;
revoke all on public.share_contributions from anon;

drop policy if exists shares_own  on public.shares;
drop policy if exists contrib_own on public.share_contributions;

create policy shares_own on public.shares
  for select using (auth.uid() = owner);

drop policy if exists shares_ins on public.shares;
drop policy if exists shares_upd on public.shares;
drop policy if exists shares_del on public.shares;

create policy shares_ins on public.shares
  for insert with check (auth.uid() = owner);

create policy shares_upd on public.shares
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

create policy shares_del on public.shares
  for delete using (auth.uid() = owner);

grant insert, update, delete on public.shares to authenticated;
grant delete on public.share_contributions to authenticated;

/* Номер версії піднімає сама база. Якби це робив клієнт, два пристрої
   могли б поставити однаковий номер — і сторінка учня не помітила б зміни. */
create or replace function public.shares_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.data is distinct from old.data then
    new.rev := old.rev + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists shares_touch_trg on public.shares;
create trigger shares_touch_trg
  before update on public.shares
  for each row execute function public.shares_touch();

create policy contrib_own on public.share_contributions
  for select using (
    exists (select 1 from public.shares s where s.token = share_contributions.token and s.owner = auth.uid())
  );

-- ------------------------------------------------------------
-- Що може учень
-- ------------------------------------------------------------

/* Прочитати урок. Повертає і номер версії — щоб сторінка учня могла питати
   «чи є нове» дешево, не тягнучи весь урок щоразу. */
create or replace function public.share_read(p_token text)
returns table (data text, rev bigint, can_write boolean, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.data, s.rev, s.can_write, s.updated_at
  from public.shares s
  where s.token = p_token and not s.revoked;
$$;

/* Тільки номер версії — для частого опитування. */
create or replace function public.share_rev(p_token text)
returns bigint
language sql
security definer
set search_path = public
as $$
  select s.rev from public.shares s where s.token = p_token and not s.revoked;
$$;

/* Записати внесок учня: штрихи на дошці або фото домашнього.
   Розмір обмежений навмисно — щоб посиланням не можна було завалити базу. */
create or replace function public.share_contribute(p_token text, p_kind text, p_payload text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_ok boolean;
begin
  if p_kind not in ('ink', 'homework') then
    raise exception 'Невідомий тип внеску';
  end if;
  if length(p_payload) > 400000 then
    raise exception 'Завеликий внесок';
  end if;

  select (not revoked) and can_write into v_ok from public.shares where token = p_token;
  if v_ok is not true then
    raise exception 'Доступ закрито';
  end if;

  -- захист від завалювання: не більше 500 внесків на одне посилання
  if (select count(*) from public.share_contributions where token = p_token) >= 500 then
    raise exception 'Забагато записів за цим посиланням';
  end if;

  insert into public.share_contributions (token, kind, payload)
  values (p_token, p_kind, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.share_read(text)                     from public;
revoke all on function public.share_rev(text)                      from public;
revoke all on function public.share_contribute(text, text, text)   from public;

grant execute on function public.share_read(text)                   to anon, authenticated;
grant execute on function public.share_rev(text)                    to anon, authenticated;
grant execute on function public.share_contribute(text, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- Фото рішень від учня
-- ------------------------------------------------------------
--
-- Учень кладе файли лише в теку, названу його ж кодом доступу, і лише поки
-- код чинний. Перевіряє це база, а не сторінка — підмінити не вийде.

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

drop policy if exists uploads_read   on storage.objects;
drop policy if exists uploads_write  on storage.objects;
drop policy if exists uploads_delete on storage.objects;

/* Правила на читання тут немає навмисно. Фото відкриваються за прямою
   адресою й без нього (кошик публічний), учень лише додає файли — для цього
   досить права на запис. А правило на читання дозволило б кожному
   переглянути список файлів — і з ним коди всіх посилань. */

/* Перевірку виносимо в окрему функцію, бо саме правило виконується з правами
   того, хто вантажить, — тобто учня. Прямого доступу до таблиці посилань
   у нього немає й не повинно бути, тому підзапит до неї падав із
   «permission denied for table shares». Функція працює з правами власника
   і повертає лише «так/ні», нічого не розкриваючи. */
create or replace function public.share_can_write(p_token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shares s
    where s.token = p_token and not s.revoked and s.can_write
  );
$$;

revoke all on function public.share_can_write(text) from public;
grant execute on function public.share_can_write(text) to anon, authenticated;

create policy uploads_write on storage.objects
  for insert with check (
    bucket_id = 'uploads'
    and public.share_can_write((storage.foldername(name))[1])
  );

-- прибирати може лише репетитор, якому належить це посилання
create policy uploads_delete on storage.objects
  for delete using (
    bucket_id = 'uploads'
    and exists (
      select 1 from public.shares s
      where s.token = (storage.foldername(name))[1] and s.owner = auth.uid()
    )
  );

-- ============================================================
-- Запобіжник від затирання даних
-- ============================================================
--
-- Навіщо це в базі, а не в програмі. Пристрій, який давно не відкривали,
-- має старі дані. Якщо він відправить їх поверх свіжих, зникнуть учні,
-- уроки й оплати. У програмі перевірка вже є, але вона не рятує від
-- пристрою, на якому програма стара: телефон тримає файли в кеші й може
-- тижнями працювати попередньою версією.
--
-- База — єдине місце, де сходяться всі пристрої. Тут перевірка діє
-- незалежно від того, хто і якою версією пише.
--
-- Правило просте: запис, який ПОВНІСТЮ ВИДАЛЯЄ наявні записи, не
-- проходить сам собою. Зміни всередині записів (перейменування, нова
-- тема, оплата) не обмежуються ніяк — блокується лише зникнення.

/* Що саме зникне, якщо прийняти новий документ. Повертає, наприклад,
   'students:5', або null, якщо нічого не втрачається. */
create or replace function public.state_would_lose(p_old text, p_new text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_names text[] := array['students', 'lessons', 'payments', 'homeworks', 'boards'];
  v_name  text;
  v_lost  bigint;
  v_o     jsonb;
  v_n     jsonb;
begin
  if p_old is null or p_new is null then return null; end if;

  begin
    v_o := p_old::jsonb;
    v_n := p_new::jsonb;
  exception when others then
    return null;                       -- не JSON: не нам судити
  end;

  foreach v_name in array v_names loop
    -- якщо будь-де не масив, порівнювати нічого
    if jsonb_typeof(v_o -> v_name) = 'array' and jsonb_typeof(v_n -> v_name) = 'array' then
      select count(*) into v_lost
      from jsonb_array_elements(v_o -> v_name) old_el
      where old_el ->> 'id' is not null
        and not exists (
          select 1
          from jsonb_array_elements(v_n -> v_name) new_el
          where new_el ->> 'id' = old_el ->> 'id'
        );

      if v_lost > 0 then
        return v_name || ':' || v_lost;
      end if;
    end if;
  end loop;

  return null;
end;
$$;

revoke all on function public.state_would_lose(text, text) from public, anon, authenticated;

/* Стару тризначну версію треба саме прибрати: якби вона лишилася поруч із
   новою, виклик із трьома аргументами став би неоднозначним. */
drop function if exists public.save_state(text, bigint, text);

/* Повертає новий rev при успіху,
   -1 — на сервері вже свіжіша версія (хтось зберіг з іншого пристрою),
   -2 — запис знищив би наявні записи; програма мусить спершу підтягнути
        серверну версію. p_force = true проходить попри це: ним користується
        свідоме видалення, яке робить людина. */
create or replace function public.save_state(
  p_data text,
  p_base_rev bigint,
  p_device text,
  p_force boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_rev   bigint;
  v_old   text;
  v_loss  text;
begin
  if v_owner is null then
    raise exception 'Не авторизовано';
  end if;

  select rev, data into v_rev, v_old
  from public.state where owner = v_owner and id = 'main';

  if v_rev is null then
    insert into public.state (id, owner, rev, data, device)
    values ('main', v_owner, 1, p_data, p_device);
    return 1;
  end if;

  if v_rev <> p_base_rev then
    return -1;                     -- конфлікт: на сервері новіше
  end if;

  if not coalesce(p_force, false) then
    v_loss := public.state_would_lose(v_old, p_data);
    if v_loss is not null then
      return -2;                   -- відмова: запис знищив би дані
    end if;
  end if;

  update public.state
     set data = p_data, rev = v_rev + 1, device = p_device
   where owner = v_owner and id = 'main';

  return v_rev + 1;
end;
$$;

revoke all on function public.save_state(text, bigint, text, boolean) from public, anon;
grant execute on function public.save_state(text, bigint, text, boolean) to authenticated;

-- ============================================================
-- Портал учня: свій розклад і матеріали
-- ============================================================
--
-- Окремо від shares навмисно. Посилання на урок дає рівно один урок;
-- портал — це постійний вхід учня, і живе він за іншими правилами.
--
-- Що учень бачить: свої заняття (дата, час, тема, стан) і матеріали, які
-- репетитор йому відкрив. Чого не бачить: грошей узагалі — ні ціни заняття,
-- ні оплат, ні боргу. Їх немає не в інтерфейсі, а в самих даних: репетитор
-- складає для порталу окремий документ і кладе туди лише дозволене.
--
-- Вхід: довге посилання (128 бітів) плюс короткий код, який задає репетитор.
-- Посилання — і є основний захист; код — на випадок, якщо посилання побачить
-- хтось сторонній (спільний комп'ютер, переслане повідомлення).

create table if not exists public.portals (
  token      text        primary key,
  owner      uuid        not null references auth.users (id) on delete cascade,
  student_id text        not null,
  pin        text,                                -- короткий код; null — входити без коду
  fails      int         not null default 0,      -- поспіль невдалих спроб коду
  revoked    boolean     not null default false,
  data       text,                                -- JSON: розклад і матеріали
  rev        bigint      not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- один портал на учня: інакше старі посилання жили б поруч із новими
create unique index if not exists portals_student_idx on public.portals (owner, student_id);
create index if not exists portals_owner_idx on public.portals (owner);

alter table public.portals enable row level security;

grant select, insert, update, delete on public.portals to authenticated;
revoke all on public.portals from anon;

drop policy if exists portals_own on public.portals;
drop policy if exists portals_ins on public.portals;
drop policy if exists portals_upd on public.portals;
drop policy if exists portals_del on public.portals;

create policy portals_own on public.portals
  for select using (auth.uid() = owner);
create policy portals_ins on public.portals
  for insert with check (auth.uid() = owner);
create policy portals_upd on public.portals
  for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy portals_del on public.portals
  for delete using (auth.uid() = owner);

/* Номер версії піднімає база — щоб сторінка учня бачила зміни. Заразом
   скидаємо лічильник невдалих спроб, коли репетитор змінює код: інакше
   заблокований портал не можна було б відкрити навіть новим кодом. */
create or replace function public.portals_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.data is distinct from old.data then
    new.rev := old.rev + 1;
    new.updated_at := now();
  end if;
  if new.pin is distinct from old.pin then
    new.fails := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists portals_touch_trg on public.portals;
create trigger portals_touch_trg
  before update on public.portals
  for each row execute function public.portals_touch();

-- ------------------------------------------------------------
-- Що може учень
-- ------------------------------------------------------------

/* Чи потрібен код. Навмисно не повертає ні імені, ні будь-чого іншого:
   до вдалого входу стороння людина не має дізнатися навіть, чий це портал. */
create or replace function public.portal_gate(p_token text)
returns table (needs_pin boolean, locked boolean)
language sql
security definer
set search_path = public
as $$
  select (p.pin is not null), (p.fails >= 10)
  from public.portals p
  where p.token = p_token and not p.revoked;
$$;

/* Перевірка коду в одному місці. Рахує невдалі спроби: маючи посилання,
   чотиризначний код інакше можна було б просто перебрати. Після десяти
   помилок портал закривається, поки репетитор не задасть код наново. */
create or replace function public.portal_ok(p_token text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin   text;
  v_fails int;
begin
  select pin, fails into v_pin, v_fails
  from public.portals
  where token = p_token and not revoked;

  if not found then return false; end if;
  if v_fails >= 10 then return false; end if;
  if v_pin is null then return true; end if;

  if v_pin = coalesce(p_pin, '') then
    if v_fails > 0 then
      update public.portals set fails = 0 where token = p_token;
    end if;
    return true;
  end if;

  update public.portals set fails = v_fails + 1 where token = p_token;
  return false;
end;
$$;

create or replace function public.portal_read(p_token text, p_pin text)
returns table (data text, rev bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.portal_ok(p_token, p_pin) then
    raise exception 'Доступ закрито';
  end if;
  return query
    select p.data, p.rev, p.updated_at
    from public.portals p
    where p.token = p_token and not p.revoked;
end;
$$;

/* Лише номер версії — для дешевого опитування «чи є нове».
   Код тут не перевіряємо навмисно: номер версії нічого не розкриває,
   а перевірка на кожне опитування накручувала б лічильник спроб. */
create or replace function public.portal_rev(p_token text)
returns bigint
language sql
security definer
set search_path = public
as $$
  select p.rev from public.portals p where p.token = p_token and not p.revoked;
$$;

revoke all on function public.portal_gate(text)       from public;
revoke all on function public.portal_ok(text, text)   from public;
revoke all on function public.portal_read(text, text) from public;
revoke all on function public.portal_rev(text)        from public;

-- portal_ok лишається лише для внутрішнього виклику з portal_read:
-- інакше нею можна було б перебирати код без жодного сліду в даних
grant execute on function public.portal_gate(text)       to anon, authenticated;
grant execute on function public.portal_read(text, text) to anon, authenticated;
grant execute on function public.portal_rev(text)        to anon, authenticated;


/* ============================================================
   Дошки — кожна окремим рядком
   ============================================================

   Досі вся база їхала одним документом, і дошки були його частиною. Через
   це запис дошки означав «перепиши все цілком»: помилка в будь-якому
   іншому місці забирала дошку заразом, а пристрій із давніми даними
   приносив старе про все одразу.

   Тепер у кожної дошки власний рядок і власний номер версії. Запис дошки
   не торкається учнів і фінансів, а запис бази не торкається дошок. */

create table if not exists public.boards (
  owner      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  board_id   text        not null,          -- ідентифікатор уроку або власної справи
  rev        bigint      not null default 1,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  device     text,
  primary key (owner, board_id)
);

alter table public.boards enable row level security;

drop policy if exists boards_own on public.boards;
create policy boards_own on public.boards
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

/* Права на саму таблицю — окремо від правила вище. Без них правило нічого
   не дає: сервер відповідає «permission denied for table boards», і жоден
   пристрій не може прочитати дошки. Так і сталося у вересні 2026: запис
   ішов через save_board (вона працює з правами власника), а читання — ні,
   і кожен пристрій бачив лише своє. Пишуть у таблицю лише функції. */
grant select, delete on public.boards to authenticated;

/* Скільки об'єктів на дошці. Потрібно, щоб відрізнити свідоме стирання
   від запису, який просто приїхав із давнього пристрою. */
create or replace function public.board_items(p_data jsonb)
returns bigint
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(sum(jsonb_array_length(coalesce(s->'items', '[]'::jsonb))), 0)
  from jsonb_array_elements(coalesce(p_data->'slides', '[]'::jsonb)) as s;
$$;

/* Скільки слайдів із вмістом.
   Самих об'єктів недостатньо, і через це зникали ДЗ: слайд із трьома
   скріншотами домашнього важить три об'єкти, а десяток штрихів олівцем на
   слайді уроку — десять. Дошка з більшою кількістю ліній вважалася
   «повнішою» й забирала з собою цілий слайд. Слайди рахуються окремо. */
create or replace function public.board_slides(p_data jsonb)
returns bigint
language sql
immutable
set search_path = public, pg_temp
as $$
  select count(*)
  from jsonb_array_elements(coalesce(p_data->'slides', '[]'::jsonb)) as s
  where jsonb_array_length(coalesce(s->'items', '[]'::jsonb)) > 0;
$$;

/**
 * Зберегти дошку.
 *
 * Повертає новий номер версії, або:
 *   -1 — на сервері вже новіша версія (хтось зберіг з іншого пристрою);
 *   -2 — запис знищив би наявні об'єкти, а дозволу на це не давали.
 *
 * Друга перевірка — головна. Саме вона робить неможливим те, через що
 * дошки зникали: тихий запис поверх повної версії порожньою.
 */
create or replace function public.save_board(
  p_board  text,
  p_rev    bigint,
  p_data   jsonb,
  p_device text default null,
  p_force  boolean default false
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  cur     public.boards%rowtype;
  new_rev bigint;
begin
  if auth.uid() is null then
    raise exception 'Потрібен вхід';
  end if;

  select * into cur from public.boards
   where owner = auth.uid() and board_id = p_board;

  if not found then
    insert into public.boards (owner, board_id, rev, data, device)
    values (auth.uid(), p_board, 1, p_data, p_device);
    return 1;
  end if;

  if cur.rev <> p_rev then
    return -1;
  end if;

  if not p_force
     and public.board_items(cur.data) > 0
     and (public.board_items(p_data) < public.board_items(cur.data)
       or public.board_slides(p_data) < public.board_slides(cur.data)) then
    return -2;
  end if;

  new_rev := cur.rev + 1;
  update public.boards
     set data = p_data, rev = new_rev, updated_at = now(), device = p_device
   where owner = auth.uid() and board_id = p_board;

  return new_rev;
end;
$$;

revoke all on function public.save_board(text, bigint, jsonb, text, boolean) from public;
grant execute on function public.save_board(text, bigint, jsonb, text, boolean) to authenticated;


/* ============================================================
   Записи — кожен окремим рядком
   ============================================================

   Досі вся база їхала одним документом. Такий запис завжди означає «хай
   стане ось так», а отже вміє стирати: якщо програма чогось не побачила,
   воно зникало разом із записом. Саме так втрачалися учні й дошки.

   Тут кожен запис — власний рядок. «Онови цього учня» фізично не може
   зачепити сусіднього. Два пристрої, що правлять різних учнів, більше не
   конфліктують взагалі.

   Одна таблиця на всі види, а не окрема на кожен: програма зберігає
   звичайні об'єкти з полем id і фільтрує їх у себе в пам'яті, а не
   запитами. Окремі таблиці дали б стовпці, якими ніхто не користується,
   і десяток однакових наборів правил доступу.

   Видалення — позначка, а не стирання. Помилкове видалення повертається,
   і жоден рядок ніколи не зникає з бази фізично. */

create table if not exists public.records (
  owner      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text        not null,      -- students | lessons | payments | homeworks | ...
  id         text        not null,
  data       jsonb       not null,
  rev        bigint      not null default 1,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  device     text,
  primary key (owner, kind, id)
);

create index if not exists records_owner_updated on public.records (owner, updated_at);

alter table public.records enable row level security;

drop policy if exists records_own on public.records;
create policy records_own on public.records
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

/**
 * Записати один запис. Повертає новий номер версії.
 *
 * Свідомо «перемагає той, хто пише останнім» — але в межах одного запису.
 * Це і є вся різниця: раніше останній запис забирав усю базу, тепер лише
 * той рядок, який справді редагували.
 */
create or replace function public.save_record(
  p_kind   text,
  p_id     text,
  p_data   jsonb,
  p_device text default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_rev bigint;
begin
  if auth.uid() is null then
    raise exception 'Потрібен вхід';
  end if;

  insert into public.records (owner, kind, id, data, rev, deleted, device)
  values (auth.uid(), p_kind, p_id, p_data, 1, false, p_device)
  on conflict (owner, kind, id) do update
    set data       = excluded.data,
        rev        = public.records.rev + 1,
        deleted    = false,          -- редагування воскрешає помилково видалене
        updated_at = now(),
        device     = excluded.device
  returning rev into new_rev;

  return new_rev;
end;
$$;

/**
 * Видалити запис — тобто позначити видаленим.
 *
 * Дані лишаються в базі назавжди. Так помилкове видалення (моє чи ваше)
 * перестає бути втратою: рядок на місці, його видно й можна повернути.
 */
create or replace function public.delete_record(
  p_kind   text,
  p_id     text,
  p_device text default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_rev bigint;
begin
  if auth.uid() is null then
    raise exception 'Потрібен вхід';
  end if;

  update public.records
     set deleted = true, rev = rev + 1, updated_at = now(), device = p_device
   where owner = auth.uid() and kind = p_kind and id = p_id
  returning rev into new_rev;

  return coalesce(new_rev, 0);
end;
$$;

/** Повернути помилково видалене. */
create or replace function public.undelete_record(p_kind text, p_id text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_rev bigint;
begin
  if auth.uid() is null then
    raise exception 'Потрібен вхід';
  end if;
  update public.records
     set deleted = false, rev = rev + 1, updated_at = now()
   where owner = auth.uid() and kind = p_kind and id = p_id
  returning rev into new_rev;
  return coalesce(new_rev, 0);
end;
$$;

revoke all on function public.save_record(text, text, jsonb, text)   from public;
revoke all on function public.delete_record(text, text, text)        from public;
revoke all on function public.undelete_record(text, text)            from public;

grant execute on function public.save_record(text, text, jsonb, text) to authenticated;
grant execute on function public.delete_record(text, text, text)      to authenticated;
grant execute on function public.undelete_record(text, text)          to authenticated;


/* ============================================================
   Журнал дій на дошці
   ============================================================

   Дошка й досі зберігається цілком — це швидкий спосіб її відкрити. Але
   будь-яке збереження цілком означає «хай стане ось так», а отже вміє
   стирати: досить одному пристроєві мати неповну картину.

   Тут навпаки — тільки дописування. «Додано лінію», «пересунуто фігуру»,
   «видалено картинку». Рядки ніколи не змінюються й не видаляються.

   Звідси дві речі, яких не було. Перша: два пристрої, що малюють одночасно,
   більше не забирають роботу один в одного — їхні дії просто лягають поруч.
   Друга: учень може бачити малювання наживо, бо йому достатньо читати нові
   рядки, а не чекати перевидання сторінки.

   Знімок у таблиці boards лишається: відкривати дошку з нуля по тисячі
   дрібних дій довго. Він каже, на якій дії його зроблено, і читати треба
   лише те, що після неї. */

create table if not exists public.board_ops (
  id     bigserial   primary key,
  owner  uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  board  text        not null,
  op     jsonb       not null,
  author text        not null default 'tutor',   -- tutor | student
  at     timestamptz not null default now()
);

create index if not exists board_ops_lookup on public.board_ops (owner, board, id);

alter table public.board_ops enable row level security;

drop policy if exists board_ops_own on public.board_ops;
create policy board_ops_own on public.board_ops
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- читати журнал свого акаунта; дописує лише append_board_ops (див. boards вище)
grant select on public.board_ops to authenticated;

/* На якій дії зроблено знімок дошки. Без цього при відкритті довелося б
   перечитувати весь журнал від початку часів. */
alter table public.boards add column if not exists last_op bigint not null default 0;

/**
 * Дописати дії. Повертає номер останньої.
 *
 * Тільки insert — жодного update чи delete. Саме тому цей шлях не вміє
 * втрачати: щоб щось зникло, потрібен окремий запис «видалено», і він теж
 * лишиться в журналі назавжди.
 */
create or replace function public.append_board_ops(
  p_board text,
  p_ops   jsonb            -- масив дій
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  last_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Потрібен вхід';
  end if;

  insert into public.board_ops (owner, board, op, author)
  select auth.uid(), p_board, value, 'tutor'
    from jsonb_array_elements(p_ops);

  select max(id) into last_id
    from public.board_ops
   where owner = auth.uid() and board = p_board;

  return coalesce(last_id, 0);
end;
$$;

revoke all on function public.append_board_ops(text, jsonb) from public;
grant execute on function public.append_board_ops(text, jsonb) to authenticated;


/* ============================================================
   Дошка наживо для учня
   ============================================================

   Учень не має входу й не бачить жодної таблиці. Ці дві функції — весь його
   доступ: читати дії однієї дошки й дописувати свої. Ключ — код у посиланні,
   той самий, яким відкривається урок.

   Записи учня позначені окремо ('student'), тож на дошці видно, де він, а
   де репетитор, і його роботу неможливо сплутати зі своєю. */

create or replace function public.share_ops_read(p_token text, p_after bigint default 0)
returns table (id bigint, op jsonb, author text, at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
begin
  select * into s from public.shares where token = p_token and not revoked;
  if not found then
    raise exception 'Посилання недійсне';
  end if;

  return query
    select o.id, o.op, o.author, o.at
      from public.board_ops o
     where o.owner = s.owner and o.board = s.lesson_id and o.id > coalesce(p_after, 0)
     order by o.id
     limit 2000;
end;
$$;

create or replace function public.share_ops_write(p_token text, p_ops jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  last_id bigint;
begin
  select * into s from public.shares where token = p_token and not revoked;
  if not found then
    raise exception 'Посилання недійсне';
  end if;
  if not coalesce(s.can_write, false) then
    raise exception 'На цій дошці можна лише дивитися';
  end if;

  /* Обмеження на пачку: посилання відкрите будь-кому, хто його має, і
     єдиний спосіб ним нашкодити — завалити дошку сміттям. */
  if jsonb_array_length(p_ops) > 200 then
    raise exception 'Забагато дій за раз';
  end if;

  insert into public.board_ops (owner, board, op, author)
  select s.owner, s.lesson_id, value, 'student'
    from jsonb_array_elements(p_ops);

  select max(id) into last_id
    from public.board_ops
   where owner = s.owner and board = s.lesson_id;

  return coalesce(last_id, 0);
end;
$$;

revoke all on function public.share_ops_read(text, bigint) from public;
revoke all on function public.share_ops_write(text, jsonb) from public;

grant execute on function public.share_ops_read(text, bigint) to anon, authenticated;
grant execute on function public.share_ops_write(text, jsonb) to anon, authenticated;

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

-- ============================================================
-- Збереження стану: одна операція замість "прочитати, порівняти, записати"
-- ============================================================
--
-- Повертає новий rev при успіху або -1, якщо на сервері вже є свіжіша версія
-- (тобто хтось зберіг з іншого пристрою). Тоді програма не перезаписує чуже,
-- а показує попередження — так втратити дані неможливо.

create or replace function public.save_state(p_data text, p_base_rev bigint, p_device text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_rev   bigint;
begin
  if v_owner is null then
    raise exception 'Не авторизовано';
  end if;

  select rev into v_rev from public.state where owner = v_owner and id = 'main';

  if v_rev is null then
    insert into public.state (id, owner, rev, data, device)
    values ('main', v_owner, 1, p_data, p_device);
    return 1;
  end if;

  if v_rev <> p_base_rev then
    return -1;                     -- конфлікт: на сервері новіше
  end if;

  update public.state
     set data = p_data, rev = v_rev + 1, device = p_device
   where owner = v_owner and id = 'main';

  return v_rev + 1;
end;
$$;

-- Postgres за замовчуванням дозволяє викликати функції всім. Для save_state це
-- безпечно (вона сама бере власника з auth.uid()), а от trim_snapshots приймає
-- власника аргументом і працює з правами власника схеми — тому доступ до неї
-- і до тригерної функції треба відібрати, інакше нею можна було б повидаляти
-- чужі резервні копії.
revoke all on function public.trim_snapshots(uuid, int) from public, anon, authenticated;
revoke all on function public.state_archive()              from public, anon, authenticated;

grant execute on function public.save_state(text, bigint, text) to authenticated;

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

create policy shares_read on storage.objects
  for select using (bucket_id = 'shares');

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

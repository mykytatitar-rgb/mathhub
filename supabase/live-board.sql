/* ============================================================
   Жива дошка для учня — як у Miro
   ============================================================

   Досі учень бачив окрему спрощену копію уроку: кабінет складав її в
   HTML-сторінку й перевидавав після змін. Звідси «учень бачить старе» і
   інша картинка, ніж у репетитора.

   Тепер сторінка учня запускає той самий рушій дошки й читає її стан
   прямо з бази: останній знімок дошки плюс дії, записані після нього.
   Нічого не перевидається — нова дія в журналі одразу видна учневі.

   Що дозволено учневі, перевіряє сама база, а не сторінка:
     • бачить лише не приховані слайди;
     • пише лише власні обʼєкти — додає, змінює й стирає написане ним самим;
     • обʼєкти репетитора й самі слайди йому не підвладні.

   Скрипт можна виконувати повторно: він лише створює або замінює функції. */


/* Чи прихований слайд. У дошці позначка лежить числом 0/1, але читаємо
   обережно, щоб і true не проскочило. */
create or replace function public.slide_hidden(p_slide jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(p_slide->>'hidden', '0') in ('1', 'true');
$$;


/* Номери прихованих слайдів дошки — щоб відсіяти їхні дії. */
create or replace function public.board_hidden_slides(p_data jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(s->>'id'), '{}')
  from jsonb_array_elements(coalesce(p_data->'slides', '[]'::jsonb)) as s
  where public.slide_hidden(s);
$$;


/* Чи можна показати дію учневі. Дії над прихованим слайдом і нові
   приховані слайди до нього не потрапляють. */
create or replace function public.op_visible(p_op jsonb, p_hidden text[])
returns boolean
language sql
immutable
as $$
  select case
    when p_op->>'t' = 's+' then not public.slide_hidden(p_op->'sl')
    when p_op ? 's'       then not ((p_op->>'s') = any (p_hidden))
    else true
  end;
$$;


/**
 * Дошка уроку для учня: знімок без прихованих слайдів.
 *
 * Разом зі знімком повертається мітка since — з якого часу дочитувати
 * журнал. Вона навмисно на пів хвилини раніша за сам знімок: дії, що
 * встигли в журнал, поки знімок їхав на сервер, так точно не загубляться,
 * а повторити вже враховану дію безпечно — кожна називає свій обʼєкт.
 */
create or replace function public.share_board(p_token text)
returns table (data jsonb, since timestamptz, can_write boolean, owner_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  b record;
begin
  select * into s from public.shares sh where sh.token = p_token and not sh.revoked;
  if not found then
    raise exception 'Посилання недійсне';
  end if;

  select * into b from public.boards bb where bb.owner = s.owner and bb.board_id = s.lesson_id;
  if not found then
    return;          -- знімка ще немає: сторінка учня покаже урок по-старому
  end if;

  return query select
    jsonb_set(
      b.data,
      '{slides}',
      coalesce((
        select jsonb_agg(sl)
        from jsonb_array_elements(coalesce(b.data->'slides', '[]'::jsonb)) as sl
        where not public.slide_hidden(sl)
      ), '[]'::jsonb)
    ),
    b.updated_at - interval '30 seconds',
    coalesce(s.can_write, false),
    s.owner;
end;
$$;


/**
 * Дії, яких бракує знімку: репетиторові — після мітки since, учнівські —
 * усі (їх мало, і в знімку їх може ще не бути, поки репетитор їх не забрав).
 */
create or replace function public.share_board_ops(p_token text, p_since timestamptz)
returns table (id bigint, op jsonb, author text, at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  hidden text[];
begin
  select * into s from public.shares sh where sh.token = p_token and not sh.revoked;
  if not found then
    raise exception 'Посилання недійсне';
  end if;

  select public.board_hidden_slides(b.data) into hidden
    from public.boards b where b.owner = s.owner and b.board_id = s.lesson_id;
  hidden := coalesce(hidden, '{}');

  return query
    select o.id, o.op, o.author, o.at
      from public.board_ops o
     where o.owner = s.owner and o.board = s.lesson_id
       and (o.author = 'student' or o.at > p_since)
       and public.op_visible(o.op, hidden)
     order by o.id
     limit 5000;
end;
$$;


/* Нові дії після номера — для живого оновлення. Та сама функція, що й
   була, але тепер не віддає дій над прихованими слайдами. */
create or replace function public.share_ops_read(p_token text, p_after bigint default 0)
returns table (id bigint, op jsonb, author text, at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  hidden text[];
begin
  select * into s from public.shares sh where sh.token = p_token and not sh.revoked;
  if not found then
    raise exception 'Посилання недійсне';
  end if;

  select public.board_hidden_slides(b.data) into hidden
    from public.boards b where b.owner = s.owner and b.board_id = s.lesson_id;
  hidden := coalesce(hidden, '{}');

  return query
    select o.id, o.op, o.author, o.at
      from public.board_ops o
     where o.owner = s.owner and o.board = s.lesson_id and o.id > coalesce(p_after, 0)
       and public.op_visible(o.op, hidden)
     order by o.id
     limit 2000;
end;
$$;


/**
 * Записати дії учня.
 *
 * Сторінка учня й сама не дає чіпати чуже, але покладатися на неї не
 * можна: посилання може опинитися в будь-кого. Тому база пропускає лише
 * три види дій і лише над власними обʼєктами учня:
 *   i+  — новий обʼєкт, позначений як учнівський (by = student);
 *   i~  — зміна обʼєкта, який учень сам і створив;
 *   i-  — стирання обʼєктів, які учень сам і створив.
 */
create or replace function public.share_ops_write(p_token text, p_ops jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  o jsonb;
  t text;
  item_id text;
  hidden text[];
  bdata jsonb;
  last_id bigint;
begin
  select * into s from public.shares sh where sh.token = p_token and not sh.revoked;
  if not found then
    raise exception 'Посилання недійсне';
  end if;
  if not coalesce(s.can_write, false) then
    raise exception 'На цій дошці можна лише дивитися';
  end if;
  if jsonb_typeof(p_ops) <> 'array' or jsonb_array_length(p_ops) > 200 then
    raise exception 'Забагато дій за раз';
  end if;
  if length(p_ops::text) > 400000 then
    raise exception 'Завеликий запис';
  end if;

  select b.data into bdata
    from public.boards b where b.owner = s.owner and b.board_id = s.lesson_id;
  hidden := public.board_hidden_slides(coalesce(bdata, '{}'::jsonb));

  for o in select e.value from jsonb_array_elements(p_ops) as e loop
    t := o->>'t';

    if t not in ('i+', 'i~', 'i-') then
      raise exception 'Учень може лише писати на дошці';
    end if;
    if (o->>'s') = any (hidden) then
      raise exception 'Цей слайд прихований';
    end if;

    if t in ('i+', 'i~') then
      if coalesce(o->'it'->>'by', '') <> 'student' then
        raise exception 'Можна змінювати лише своє';
      end if;
      item_id := o->'it'->>'id';
      if item_id is null then
        raise exception 'Обʼєкт без номера';
      end if;

      /* Обʼєкт із номером репетиторового підмінив би його при застосуванні.
         Тому номер не має збігатися ні з обʼєктом у знімку дошки, ні з
         обʼєктом, який репетитор додав уже після знімка. */
      if exists (
        select 1
          from jsonb_array_elements(coalesce(bdata->'slides', '[]'::jsonb)) as sl,
               jsonb_array_elements(coalesce(sl->'items', '[]'::jsonb)) as it
         where it->>'id' = item_id and coalesce(it->>'by', '') <> 'student'
      ) or exists (
        select 1 from public.board_ops x
         where x.owner = s.owner and x.board = s.lesson_id and x.author = 'tutor'
           and x.op->'it'->>'id' = item_id
      ) then
        raise exception 'Можна змінювати лише своє';
      end if;

      -- змінювати можна лише те, що учень сам колись додав
      if t = 'i~' and not exists (
        select 1 from public.board_ops x
         where x.owner = s.owner and x.board = s.lesson_id and x.author = 'student'
           and x.op->>'t' = 'i+' and x.op->'it'->>'id' = item_id
      ) and not exists (
        select 1 from jsonb_array_elements(p_ops) as y
         where y.value->>'t' = 'i+' and y.value->'it'->>'id' = item_id
      ) then
        raise exception 'Можна змінювати лише своє';
      end if;
    end if;

    if t = 'i-' then
      if exists (
        select 1 from jsonb_array_elements_text(coalesce(o->'ids', '[]'::jsonb)) as k(val)
         where not exists (
           select 1 from public.board_ops x
            where x.owner = s.owner and x.board = s.lesson_id and x.author = 'student'
              and x.op->>'t' = 'i+' and x.op->'it'->>'id' = k.val
         )
      ) then
        raise exception 'Стерти можна лише своє';
      end if;
    end if;
  end loop;

  insert into public.board_ops (owner, board, op, author)
  select s.owner, s.lesson_id, e.value, 'student'
    from jsonb_array_elements(p_ops) as e;

  select max(x.id) into last_id
    from public.board_ops x
   where x.owner = s.owner and x.board = s.lesson_id;

  return coalesce(last_id, 0);
end;
$$;


/* Пошук учнівського обʼєкта за номером — щоб перевірка вище не
   переглядала весь журнал уроку. */
create index if not exists board_ops_item_ids
  on public.board_ops (owner, board, author, ((op->'it'->>'id')));


revoke all on function public.share_board(text)                    from public;
revoke all on function public.share_board_ops(text, timestamptz)   from public;
revoke all on function public.share_ops_read(text, bigint)         from public;
revoke all on function public.share_ops_write(text, jsonb)         from public;

grant execute on function public.share_board(text)                  to anon, authenticated;
grant execute on function public.share_board_ops(text, timestamptz) to anon, authenticated;
grant execute on function public.share_ops_read(text, bigint)       to anon, authenticated;
grant execute on function public.share_ops_write(text, jsonb)       to anon, authenticated;

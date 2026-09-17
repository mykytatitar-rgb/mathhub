# -*- coding: utf-8 -*-
"""Витягнути задачі з підручника з текстовим шаром.

Сторінки збирає book_layout.py (з формулами). Тут:
  • прибираємо колонтитули, підписи й залишки рисунків;
  • розрізаємо текст на задачі за нумерацією «5.12.°» або «245.•» —
    і перевіряємо, що номери йдуть підряд: «1. Які дві системи…» серед
    контрольних запитань теж починається з числа, але задачею не є;
  • запамʼятовуємо, у якому параграфі й пункті задача стоїть — за
    колонтитулом сторінки, бо саме він називає тему;
  • знаходимо розділ відповідей і пришиваємо відповіді до задач.

Результат — сирий опис книжки (JSON), який далі класифікує book_classify.py.

Запуск:  python tools/book_extract.py <книжка.pdf> <id> <вихід.json> [перша_сторінка] [остання]
"""

import io
import json
import re
import sys

import pymupdf

sys.path.insert(0, __file__.rsplit('\\', 1)[0] if '\\' in __file__ else __file__.rsplit('/', 1)[0])
from book_layout import page_lines  # noqa: E402

MARK = r'(?:\$\s*)?(?:\^\{)?\s*([°•∙*∗]{1,2})\s*\}?(?:\s*\$)?'
START2 = re.compile(r'^\s*(\d{1,2})\.(\d{1,3})\.\s*(?:' + MARK + r')?\s*(?=\S)')
START1 = re.compile(r'^\s*(\d{1,4})\.\s*(?:' + MARK + r')?\s*(?=\S)')
LEVEL = {'°': 1, '•': 2, '∙': 2, '••': 3, '∙∙': 3, '*': 3, '∗': 3, '**': 3}
PARA = re.compile(r'§\s*(\d+)\.?\s*(.+)')
POINT = re.compile(r'^(\d{1,2})\.\s+(\S.+)')
ANSWERS = re.compile(r'^\s*(ВІДПОВІДІ|Відповіді|ОТВЕТЫ|Ответы)(\s+(?i:та|до|і|и)\s+[а-яіїєґА-ЯІЇЄҐ ]+)?\s*$')
NOISE = re.compile(r'Право для безоплатного|imzo\.gov|mon\.gov|Міністерство освіти і науки|'
                   r'Інститут модернізації', re.I)
FIG = re.compile(r'^\s*(Рис\.|Рисунок|Fig\.)', re.I)
STOP = re.compile(r'^\s*(§|ПРИКЛАД|Приклад\s*\d|ВПРАВИ|Вправи\s*$|Розвʼязання|Розв[’\']язання|ЗАДАЧА|Задача\s*\d|'
                  r'ГОТУЄМОСЯ|Готуємося|УЧИМОСЯ|Учимося|ЗАДАЧІ|Задачі\s*$|КОНТРОЛЬНІ|ВПРАВИ ДЛЯ|'
                  r'Доведення\.|Теорема\s*\d|ТЕОРЕМА|Означення|ОЗНАЧЕННЯ|Відповідь:|◄)')
FIGREF = re.compile(r'(рис|мал)\.\s*\d', re.I)
SHARED = re.compile(r'^\s*([А-ЯІЇЄҐ][^()]{3,80}?)\s*\((\d{1,4})\s*[,–—-]\s*(\d{1,4})\)\.?\s*$')


def clean_title(t):
    """Колонтитул набраний капітеллю з розрядкою: «Р івняння … їхНІ» → «Рівняння … їхні»."""
    t = re.sub(r'\$', '', t)
    t = re.sub(r'^\d{1,3}\s+|\s+\d{1,3}$', '', t.strip())
    t = re.sub(r'\b([А-ЯІЇЄҐA-Z]) (?=[а-яіїєґa-z])', r'\1', t)
    t = re.sub(r'(?<!\S)([б-джзк-нп-тф-щьюяєїґ]) (?=[а-яіїєґ’]{2,})', r'\1', t)
    t = re.sub(r'(?<=[а-яіїєґ])([А-ЯІЇЄҐ]+)\b', lambda m: m.group(1).lower(), t)
    t = re.sub(r'\b([А-ЯІЇЄҐ])([А-ЯІЇЄҐ]+)\b', lambda m: m.group(0) if len(m.group(0)) <= 3 else m.group(1) + m.group(2).lower(), t)
    return re.sub(r'\s+', ' ', t).strip()


def split_items(text, marks=None):
    """Нумеровані пункти всередині формули виносимо з неї: «$…; 2) …$».

    marks — ще й номери задач «14.25.»: у розділі відповідей формула однієї
    відповіді часто зливається з номером наступної."""
    def fix(m):
        body = m.group(1)
        if marks is not None:
            body = re.sub(r'(^|\s)(' + marks + r')(?=\s|$)', r'\1$ \2 $', body)
        # «; 2) …» — пункт; «(2; 3), …» — координати, їх не чіпаємо
        body = re.sub(r'(^|[;.])\s*(\d{1,2}\))\s+(?![,;.)])', r'\1$ \2 $', body)
        return '$' + body + '$'
    text = re.sub(r'\$([^$]+)\$', fix, text)
    text = re.sub(r'\$\s*\$', ' ', text)
    text = re.sub(r'\$\s*([.,;:]+)\s*\$', r'\1 ', text)
    return re.sub(r'[ \t]{2,}', ' ', text)


def join_rows(a, b):
    """Приєднати наступний рядок: перенос слова, повтор знака дії на початку рядка."""
    if not a:
        return b
    if re.search(r'[-\xad]\s*$', a) and re.match(r'^[а-яіїєґa-z’]', b):
        return re.sub(r'[-\xad]\s*$', '', a) + b
    # «… = –n² +» / «+ 15n» — у наборі знак повторюють на новому рядку
    ma = re.search(r'([=+×·−–])\s*\$?\s*$', a)
    mb = re.match(r'^\s*(\$?)\s*([=+×·−–])', b)
    if ma and mb and ma.group(1) == mb.group(2):
        b = mb.group(1) + b[mb.end():]
    if re.match(r'^\d{1,2}\)', b):
        return a + '\n' + b
    return a + ' ' + b


def read_rows(doc, first, last):
    cache = {}
    for pno in range(first - 1, last):
        page = doc[pno]
        rows = [(y, s, _clean_start(t)) for y, s, t in page_lines(page, cache)]
        if not rows:
            continue
        sizes = [r[1] for r in rows]
        body = max(set(sizes), key=sizes.count)
        yield pno, page.rect.height, body, rows


def _clean_start(text):
    """Декоративна риска на полях перед номером: «$| 219.» → «219.»."""
    return re.sub(r'^\s*\$?\s*\|\s*\$?\s*', '', text)


def choose_numbering(pages, start_re, mode):
    """Які рядки справді починають задачу.

    Число з крапкою на початку рядка буває й задачею, і пунктом прикладу,
    і контрольним запитанням. Задачі від решти відрізняє те, що їхні номери
    йдуть підряд через усю книжку (або через пункт: 14.1, 14.2, …). Тому
    шукаємо найдовші ланцюжки номерів, де кожен наступний більший на 1–4,
    і беремо рядки лише з них."""
    cands = []
    for pno, height, body, rows in pages:
        for ri, (y, size, text) in enumerate(rows):
            if size < body - 0.5:
                continue
            m = start_re.match(text.strip())
            if not m or len(text.strip()) <= len(m.group(0)) + 2:
                continue
            key = (int(m.group(1)), int(m.group(2))) if mode == 2 else (0, int(m.group(1)))
            cands.append(((pno, ri), key))

    chosen = set()
    remaining = list(range(len(cands)))
    while True:
        best_by_key = {}          # ключ → (довжина, індекс)
        best_by_point = {}        # пункт → (довжина, індекс)
        length = {}
        parent = {}
        for i in remaining:
            p, n = cands[i][1]
            opts = []
            for k in range(1, 5):
                if (p, n - k) in best_by_key:
                    opts.append(best_by_key[(p, n - k)])
            if mode == 2 and n <= 3:
                for k in range(1, 4):
                    if p - k in best_by_point:
                        opts.append(best_by_point[p - k])
            prev = max(opts) if opts else (0, None)
            length[i] = prev[0] + 1
            parent[i] = prev[1]
            if length[i] > best_by_key.get((p, n), (0,))[0]:
                best_by_key[(p, n)] = (length[i], i)
            if length[i] > best_by_point.get(p, (0,))[0]:
                best_by_point[p] = (length[i], i)
        if not length:
            break
        end = max(length, key=lambda i: length[i])
        if length[end] < 15 and chosen:
            break
        chain = []
        while end is not None:
            chain.append(end)
            end = parent[end]
        chain.reverse()
        lo, hi = cands[chain[0]][0], cands[chain[-1]][0]
        for i in chain:
            chosen.add(cands[i][0])
        # наступний ланцюжок — лише поза сторінками цього
        remaining = [i for i in remaining if not (lo <= cands[i][0] <= hi)]
        if length[chain[-1]] < 15:
            break
    return chosen


def extract(path, first=1, last=None):
    doc = pymupdf.open(path)
    last = min(last or doc.page_count, doc.page_count)

    pages = list(read_rows(doc, first, last))

    # Яка нумерація в книжці: «14.1.» чи «245.»
    two = one = 0
    for _, _, body, rows in pages:
        for y, size, text in rows:
            if size >= body:
                if START2.match(text):
                    two += 1
                elif START1.match(text):
                    one += 1
    mode = 2 if two >= one * 0.5 else 1
    start_re = START2 if mode == 2 else START1

    accepted = choose_numbering(pages, start_re, mode)

    tasks = []
    cur = None
    para, point = '', ''
    points = {}
    in_answers = False
    answer_rows = []
    shared = {}
    paras_in_body = False

    for pno, height, body, rows in pages:
        for ri, (y, size, text) in enumerate(rows):
            text = text.strip()
            if not text or NOISE.search(text):
                continue

            # колонтитул: дрібніший шрифт біля верхнього краю — там назва теми
            if size < body and y < 80:
                t = clean_title(text)
                if ANSWERS.match(t) and pno - pages[0][0] > len(pages) * 0.5:
                    in_answers = True
                    cur = None
                m = PARA.search(t)
                if m:
                    para = '§ ' + m.group(1) + '. ' + m.group(2).strip()
                else:
                    m2 = POINT.match(t)
                    if m2:
                        point = m2.group(1) + '. ' + m2.group(2).strip()
                        points.setdefault(m2.group(1), m2.group(2).strip())
                    elif len(t) > 8 and re.search(r'[А-Яа-яІіЇїЄє]{4}', t) and not paras_in_body:
                        para = t                  # колонтитул без номера — назва розділу
                continue
            if y > height - 45 and re.fullmatch(r'\d{1,3}', text):
                continue

            if (ANSWERS.match(clean_title(text)) and len(text) < 60 and y < 250
                    and pno - pages[0][0] > len(pages) * 0.6):
                in_answers = True
                cur = None
                continue
            if in_answers:
                # підписи й позначки графіків у відповідях: «До задачі 17.18», «y x –1 0 2»
                if size < body - 0.5 or re.match(r'^До задач', text):
                    continue
                if len(text) < 25 and not re.search(r'[;(),.=]', text):
                    continue
                answer_rows.append(text)
                continue

            if FIG.match(text):
                continue

            # заголовок параграфа в самому тексті: «§ 3. Раціональні рівняння»
            mp = re.match(r'^§\s*(\d{1,2})\.?\s+([А-ЯІЇЄҐ].{3,80})$', clean_title(text))
            if mp and size >= body:
                para = '§ ' + mp.group(1) + '. ' + mp.group(2).strip()
                paras_in_body = True
                cur = None
                continue

            # спільна умова кількох задач: «Спрости вираз (314, 315).»
            ms = SHARED.match(text)
            if ms and size >= body - 0.5:
                a, b = int(ms.group(2)), int(ms.group(3))
                if 0 < b - a <= 12:
                    for k in range(a, b + 1):
                        shared[str(k)] = ms.group(1).strip()
                    continue

            if (pno, ri) in accepted:
                m = start_re.match(text)
                if m:
                    if mode == 2:
                        num = '%d.%d' % (int(m.group(1)), int(m.group(2)))
                        mark = m.group(3)
                    else:
                        num = str(int(m.group(1)))
                        mark = m.group(2)
                    cur = {
                        'n': num,
                        'lvl': LEVEL.get(mark or '', 1),
                        'p': text[m.end():].strip(),
                        'page': pno + 1,
                        'para': para,
                        'point': point
                    }
                    tasks.append(cur)
                    continue

            if cur is None:
                continue
            if STOP.match(text) or size > body + 1.5 or size < body - 1.5:
                cur = None
                continue
            # залишки рисунків: короткі рядки без розділових знаків
            if len(re.sub(r'[\s$]', '', text)) <= 4 and not re.search(r'[.;:?!]$', text):
                continue
            cur['p'] = join_rows(cur['p'], text)

    for t in tasks:
        p = re.sub(r'\xad\s*', '', t['p'])
        if t['n'] in shared and mode == 1:
            p = shared[t['n']] + '\n' + p
        p = split_items(re.sub(r'[ \t]+', ' ', p)).strip()
        p = re.sub(r'\$\s*([.,;:])', r'$\1', p)
        t['p'] = p
        if mode == 2:
            pn = t['n'].split('.')[0]
            if pn in points:
                t['point'] = pn + '. ' + points[pn]
        if FIGREF.search(p):
            t['fig'] = 1

    answers = parse_answers(answer_rows, mode)
    for t in tasks:
        if t['n'] in answers:
            t['a'] = answers[t['n']]

    return tasks, len(answers), mode


def parse_answers(rows, mode):
    """«5.6. 2. 5.7. 1) …» → {номер: відповідь}."""
    text = ''
    for r in rows:
        text = join_rows(text, r).replace('\n', ' ')
    text = re.sub(r'\xad\s*', '', text)
    if mode == 2:
        text = split_items(text, marks=r'\d{1,2}\.\d{1,3}\.')
    pat = re.compile(r'(?:^|(?<=\s))(\d{1,2}\.\d{1,3})\.\s' if mode == 2 else r'(?:^|(?<=\s))(\d{1,4})\.\s')
    out = {}
    marks = list(pat.finditer(text))
    prev = None
    # відповіді є не до кожної задачі: між сусідніми номерами буває й сотня пропущених
    gap = 40 if mode == 2 else 250
    for i, m in enumerate(marks):
        # номери відповідей теж ідуть підряд; «2.» посеред відповіді — не номер
        if mode == 2:
            key = tuple(int(x) for x in m.group(1).split('.'))
        else:
            key = (0, int(m.group(1)))
        if prev is not None and not (key > prev and (key[0] != prev[0] or key[1] - prev[1] <= gap)):
            continue
        end = len(text)
        for m2 in marks[i + 1:]:
            k2 = tuple(int(x) for x in m2.group(1).split('.')) if mode == 2 else (0, int(m2.group(1)))
            if k2 > key and (k2[0] != key[0] or k2[1] - key[1] <= gap):
                end = m2.start()
                break
        val = text[m.end():end].strip()
        if val.count('$') % 2:
            val = val.strip('$ ') if (val.startswith('$') or val.endswith('$')) else val.replace('$', '')
        if 0 < len(val) <= 500:
            out[m.group(1)] = split_items(val).strip()
            prev = key
    return out


def main():
    path, book_id, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    first = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    last = int(sys.argv[5]) if len(sys.argv) > 5 else None
    tasks, n_ans, mode = extract(path, first, last)
    io.open(out_path, 'w', encoding='utf-8', newline='').write(
        json.dumps({'id': book_id, 'file': path, 'mode': mode, 'tasks': tasks}, ensure_ascii=False, indent=1))
    with_ans = sum(1 for t in tasks if t.get('a'))
    print(book_id, '| нумерація', mode, '| задач:', len(tasks), '| відповідей:', n_ans,
          '| задач із відповіддю:', with_ans, '| з рисунком:', sum(1 for t in tasks if t.get('fig')))


if __name__ == '__main__':
    main()

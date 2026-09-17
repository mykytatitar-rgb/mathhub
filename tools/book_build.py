# -*- coding: utf-8 -*-
"""Скласти банк задач із підручників — у тому самому вигляді, що й олімпіадний.

Джерела два:
  • tools/books/catalog.json + tools/books/raw/<id>.json — книжки з текстовим
    шаром, витягнуті book_extract.py (сирі витяги в git не йдуть: це повні
    тексти книжок);
  • tools/books/*.json із полем sections — параграфи, переписані вручну зі
    сканів.

Тут задачі чистяться, розкладаються по темах карти (book_classify.py) і
записуються файлами за доменами карти. Покажчик знає книжки, класи й теми —
з нього сторінка банку будує фільтри.

Задачі з підручників — не публічний набір. Вони живуть у закритому
кабінеті репетитора, при кожній стоїть підручник, параграф і номер.

Запуск:  python tools/book_build.py
"""

import io
import json
import math
import os
import re
import subprocess
from collections import Counter

import book_classify

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'books')
RAW = os.path.join(SRC, 'raw')
OUT = os.path.join(ROOT, 'assets', 'data', 'book')

SUBJECT_DOMAIN = {'alg': 'alg', 'geo': 'geo'}


def known_topics():
    js = ("global.window={};require('" + ROOT.replace(chr(92), '/') +
          "/assets/js/mathmap-data.js');" +
          "var M=window.MATH_MAP,s={};M.sections.forEach(function(x){s[x.id]=x;});" +
          "console.log(JSON.stringify(M.topics.map(function(t){" +
          "return [t.id,t.stage,s[t.section].domain];})));")
    out = subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=ROOT, encoding='utf-8')
    return {t: {'stage': st, 'dom': d} for t, st, d in json.loads(out.stdout)}


# ---------------------------------------------------------------------------
# Назви розділів
# ---------------------------------------------------------------------------

SHORT = ('і', 'й', 'в', 'у', 'з', 'а', 'та', 'як', 'до', 'на', 'за', 'по', 'зі', 'із', 'об', 'її', 'їх', 'що', 'не')


class Words:
    """Словник слів із самих задач — щоб розклеїти «Колоікруг» на «Коло і круг».

    У частині книжок колонтитул набрано з такою щільною розрядкою, що в
    текстовому шарі між словами немає пробілів. Словник беремо з тих самих
    книжок: слова розділів трапляються й в умовах задач."""

    def __init__(self):
        self.freq = Counter()
        self.total = 0

    def feed(self, text):
        for w in re.findall(r'[а-яіїєґ’\']+', text.lower()):
            self.freq[w] += 1
            self.total += 1

    def cost(self, w):
        # кожне слово коштує ще й саме по собі: інакше «властивості» дешевше
        # розбити на «в», «ла», «с», «ти», … — усі вони теж трапляються
        n = self.freq.get(w, 0)
        if n and (len(w) > 2 or w in ('і', 'й', 'в', 'у', 'з', 'а', 'та', 'як', 'до', 'на', 'за', 'по', 'зі', 'із', 'об', 'її', 'їх')):
            return 10.0 - math.log(n / self.total)
        return 40.0 + 6 * len(w)                  # невідоме слово — дорого

    def split(self, token):
        low = token.lower()
        if self.freq.get(low, 0) >= 2 or len(low) < 5:
            return token
        n = len(low)
        best = [(0.0, 0)] + [(1e18, 0)] * n
        for i in range(1, n + 1):
            for j in range(max(0, i - 22), i):
                c = best[j][0] + self.cost(low[j:i])
                if c < best[i][0]:
                    best[i] = (c, j)
        parts, i = [], n
        while i > 0:
            j = best[i][1]
            parts.append(token[j:i])
            i = j
        parts.reverse()
        # розклеюємо лише на справжні слова: «Основна» не стане «Основ на»
        known = all(self.freq.get(x.lower(), 0) >= 2 and (len(x) > 2 or x.lower() in SHORT) for x in parts)
        return ' '.join(parts) if len(parts) > 1 and known else token


LAT2CYR = {'a': 'а', 'c': 'с', 'e': 'е', 'o': 'о', 'p': 'р', 'x': 'х', 'y': 'у', 'i': 'і',
           'A': 'А', 'C': 'С', 'E': 'Е', 'O': 'О', 'P': 'Р', 'X': 'Х', 'B': 'В', 'H': 'Н', 'K': 'К', 'M': 'М', 'T': 'Т'}


def clean_section(t, words):
    t = t or ''
    t = re.sub(r'\\[a-z]+', ' ', t)
    # «}^{Вл}|^{астивостістепенів}» — шматки одного слова, склеюємо без пробілу
    t = re.sub(r'(?<=[А-Яа-яІіЇїЄєҐґ’])[{}^_|$\s]*[{}^_|$]+[{}^_|$\s]*(?=[а-яіїєґ’])', '', t)
    t = re.sub(r'[{}^_|$]', ' ', t)
    # латинські «c», «o» посеред українського слова: «Винеcення»
    t = re.sub(r'(?<=[А-Яа-яІіЇїЄєҐґ])[aceopxyiACEOPXBHKMT]|[aceopxyiACEOPXBHKMT](?=[а-яіїєґ])',
               lambda m: LAT2CYR[m.group(0)], t)
    t = re.sub(r'\s+', ' ', t).strip(' .,;')
    t = re.sub(r'^§\s*(\d+)\s*\.?\s*', r'§ \1. ', t)
    t = re.sub(r'^(\d+)\.\s*', r'\1. ', t)
    t = re.sub(r'(?<=[А-Яа-яІіЇїЄєҐґ])(?=\d)|(?<=\d)(?=[А-Яа-яІіЇїЄєҐґ])', ' ', t)
    t = re.sub(r'[А-Яа-яІіЇїЄєҐґ’\']+', lambda m: words.split(m.group(0)), t)
    # перша літера назви — велика
    m = re.search(r'[А-Яа-яІіЇїЄєҐґA-Za-z]', t)
    if m:
        t = t[:m.start()] + t[m.start()].upper() + t[m.start() + 1:]
    return t


# ---------------------------------------------------------------------------
# Якість
# ---------------------------------------------------------------------------

def usable(p):
    """Чи можна показати задачу учневі.

    Відкидаємо те, де зникли формули (у книжці вони картинками: «1) ; 2) ;»),
    зовсім короткі уривки й сміття з таблиць."""
    if len(re.sub(r'[\s$]', '', p)) < 12:
        return False
    # «1) ; 2) ;» — два порожні пункти поспіль; «(11; 1); 4) (2; 1)» — це координати, не порожнеча
    if re.search(r'(^|[\s:])\d{1,2}\)\s*[;.,]\s*\d{1,2}\)\s*[;.,?]', p):
        return False
    if re.search(r':\s*$', p) and len(p) < 40:
        return False                          # лишився сам вступ «Розв’яжіть рівняння:»
    frac_mess = len(re.findall(r'\\frac\{\|', p))
    if frac_mess >= 2:
        return False
    return True


def tidy(p):
    p = re.sub(r'\n{2,}', '\n', p)
    p = re.sub(r'[ \t]+\n', '\n', p)
    p = re.sub(r'\$\s+', '$', p) if p.count('$') % 2 == 0 else p
    return p.strip()


# ---------------------------------------------------------------------------
# Збірка
# ---------------------------------------------------------------------------

def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    known = known_topics()
    catalog = json.load(io.open(os.path.join(SRC, 'catalog.json'), encoding='utf-8'))

    raws = {}
    words = Words()
    for b in catalog:
        path = os.path.join(RAW, b['id'] + '.json')
        if not os.path.exists(path):
            print('немає витягу', b['id'])
            continue
        raws[b['id']] = json.load(io.open(path, encoding='utf-8'))
        for t in raws[b['id']]['tasks']:
            words.feed(t['p'])

    by_domain = {}
    topic_count = Counter()
    topic_dom = {}
    books = {}
    total = 0
    unclassified = Counter()
    dropped = Counter()

    def add(item, dom):
        nonlocal total
        by_domain.setdefault(dom, []).append(item)
        for t in item['t']:
            topic_count[t] += 1
            topic_dom.setdefault(t, set()).add(dom)
        total += 1

    for b in catalog:
        if b['id'] not in raws:
            continue
        bid = b['id']
        seen = set()
        count = 0
        answered = 0
        sections = []
        for t in raws[bid]['tasks']:
            if t['n'] in seen:
                continue
            seen.add(t['n'])
            p = tidy(t['p'])
            if not usable(p):
                dropped[bid] += 1
                continue
            point = clean_section(t.get('point', ''), words)
            para = clean_section(t.get('para', ''), words)
            para = re.sub(r'^\d{1,3}\s+(?=[А-ЯІЇЄҐ])', '', para)       # номер сторінки з колонтитула
            if para and not para.startswith('§') and re.search(
                    r'повторенн|головне в|дружимо з|проєктна|проектна|відомості з курсу|предметний покажчик', para, re.I):
                point = ''          # розділ повторення: пункт, що лишився з попередніх сторінок, уже не про те
            tops = [x for x in book_classify.classify(point, para, p, b['subject'], b['grade']) if x in known]
            if not tops:
                unclassified[bid] += 1
            dom = known[tops[0]]['dom'] if tops else SUBJECT_DOMAIN.get(b['subject'], 'alg')
            sec = point or para
            if sec and sec not in sections:
                sections.append(sec)
            item = {
                'i': bid + '-' + t['n'],
                'p': p,
                'a': tidy(t.get('a') or ''),
                'd': t.get('lvl', 1),
                's': bid,
                'sec': sec,
                'num': t['n'],
                't': tops,
                'n': len(tops),
                'g': b['grade'],
                'pg': t.get('page')
            }
            if para and point:
                item['ch'] = para
            if t.get('fig'):
                item['f'] = 1
            if item['a']:
                answered += 1
            add(item, dom)
            count += 1
        canonical_sections(bid, by_domain)
        books[bid] = {
            'title': b['title'], 'year': b.get('year'), 'lang': b.get('lang', 'uk'),
            'grade': b['grade'], 'subject': b['subject'], 'count': count, 'answered': answered,
            'note': 'Задачі витягнуто з електронного видання для власного викладання.'
        }
        print('%-6s задач %4d, з відповіддю %4d, без теми %3d, відкинуто %3d' % (
            bid, count, answered, unclassified[bid], dropped[bid]))

    # вручну переписані параграфи зі сканів
    for name in sorted(os.listdir(SRC)):
        if not name.endswith('.json') or name == 'catalog.json':
            continue
        book = json.load(io.open(os.path.join(SRC, name), encoding='utf-8'))
        if 'sections' not in book:
            continue
        bid = book['id']
        n0 = total
        for sec in book['sections']:
            tops = [t for t in sec['topics'] if t in known]
            if not tops:
                continue
            dom = known[tops[0]]['dom']
            for task in sec['tasks']:
                add({
                    'i': bid + '-' + str(task['n']),
                    'p': task['p'].strip(),
                    'a': (task.get('a') or '').strip(),
                    'd': book.get('levels', {}).get(task.get('lvl'), 1),
                    's': bid,
                    'sec': '§ ' + str(sec['num']) + '. ' + sec['title'],
                    'num': str(task['n']),
                    't': tops,
                    'n': len(tops),
                    'g': book.get('grade', 8),
                    'pg': sec.get('page')
                }, dom)
        books[bid] = {
            'title': book['title'], 'year': book.get('year'), 'lang': book.get('lang', 'uk'),
            'grade': book.get('grade', 8), 'subject': book.get('subject', 'alg'),
            'count': total - n0, 'answered': 0, 'note': book.get('note', '')
        }

    for f in os.listdir(OUT):
        if f.endswith('.json'):
            os.remove(os.path.join(OUT, f))
    for dom, items in by_domain.items():
        items.sort(key=lambda x: (x['g'], x['s'], x['pg'] or 0))
        write(os.path.join(OUT, dom + '.json'), items)

    write(os.path.join(OUT, 'index.json'), {
        'built': __import__('datetime').date.today().isoformat(),
        'total': total,
        'books': books,
        'domains': {d: len(v) for d, v in by_domain.items()},
        'topics': dict(topic_count),
        'topicFiles': {k: sorted(v) for k, v in topic_dom.items()},
        'sourceCount': {k: v['count'] for k, v in books.items()}
    })
    print('задач:', total, '| тем:', len(topic_count), '| без теми:', sum(unclassified.values()),
          '| відкинуто:', sum(dropped.values()))


def canonical_sections(bid, by_domain):
    """Один розділ — одна назва.

    Колонтитул того самого параграфа на різних сторінках читається трохи
    по-різному: «Збір та аналіз даних», «Збіртааналізданих», із цифрами з
    таблиці. У фільтрі це три розділи замість одного, тож беремо найкращий
    варіант: з пробілами між словами й без зайвих чисел."""
    items = [x for lst in by_domain.values() for x in lst if x['s'] == bid]
    variants = {}
    for x in items:
        m = re.match(r'^(§\s*\d+|\d+)\.', x['sec'] or '')
        if m:
            variants.setdefault(m.group(1), Counter())[x['sec']] += 1

    def score(title):
        rest = re.sub(r'^(§\s*\d+|\d+)\.', '', title)
        return rest.count(' ') - 4 * len(re.findall(r'\d', rest)) - (3 if re.search(r'\w{18,}', rest) else 0)

    best = {k: max(v, key=lambda t: (score(t), v[t])) for k, v in variants.items()}
    for x in items:
        m = re.match(r'^(§\s*\d+|\d+)\.', x['sec'] or '')
        if m:
            x['sec'] = best[m.group(1)]


def write(path, data):
    io.open(path, 'w', encoding='utf-8', newline='').write(
        json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print('  ', os.path.basename(path), max(1, os.path.getsize(path) // 1024), 'КБ')


if __name__ == '__main__':
    main()

# -*- coding: utf-8 -*-
"""Скласти банк задач із підручників — у тому самому вигляді, що й олімпіадний.

Джерело — файли tools/books/*.json: параграфи підручника, теми карти, до
яких вони належать, і самі задачі. Українські підручники лежать сканами,
тож задачі туди переписуються вручну, сторінка за сторінкою; цей скрипт
лише розкладає їх по доменах карти й рахує покажчик.

Задачі з підручників — не публічний набір. Вони живуть у закритому
кабінеті репетитора, при кожній стоїть підручник, параграф і номер.

Запуск:  python tools/book_build.py
"""

import io
import json
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'books')
OUT = os.path.join(ROOT, 'assets', 'data', 'book')


def known_topics():
    js = ("global.window={};require('" + ROOT.replace(chr(92), '/') +
          "/assets/js/mathmap-data.js');" +
          "var M=window.MATH_MAP,s={};M.sections.forEach(function(x){s[x.id]=x;});" +
          "console.log(JSON.stringify(M.topics.map(function(t){" +
          "return [t.id,t.stage,s[t.section].domain];})));")
    out = subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=ROOT)
    return {t: {'stage': st, 'dom': d} for t, st, d in json.loads(out.stdout)}


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    known = known_topics()

    by_domain = {}
    topic_count = {}
    topic_dom = {}
    books = {}
    total = 0
    problems = 0

    for name in sorted(os.listdir(SRC)):
        if not name.endswith('.json'):
            continue
        book = json.load(io.open(os.path.join(SRC, name), encoding='utf-8'))
        bid = book['id']
        books[bid] = {
            'title': book['title'], 'year': book.get('year'),
            'lang': book.get('lang', 'uk'), 'note': book.get('note', '')
        }

        for sec in book['sections']:
            tops = [t for t in sec['topics'] if t in known]
            missing = [t for t in sec['topics'] if t not in known]
            if missing:
                print('УВАГА: у карті немає тем', missing, '(§', sec['num'], ')')
            if not tops:
                continue
            dom = known[tops[0]]['dom']

            for task in sec['tasks']:
                pid = bid + '-' + str(task['n'])
                item = {
                    'i': pid,
                    'p': task['p'].strip(),
                    'a': (task.get('a') or '').strip(),
                    'd': book.get('levels', {}).get(task.get('lvl'), 1),
                    's': bid,
                    'sec': '§ ' + str(sec['num']) + '. ' + sec['title'],
                    'num': str(task['n']),
                    't': tops,
                    'n': len(tops)
                }
                by_domain.setdefault(dom, []).append(item)
                for t in tops:
                    topic_count[t] = topic_count.get(t, 0) + 1
                    topic_dom.setdefault(t, set()).add(dom)
                problems += 1
            total += 1

    for dom, items in by_domain.items():
        items.sort(key=lambda x: (x['d'], x['i']))
        write(os.path.join(OUT, dom + '.json'), items)

    write(os.path.join(OUT, 'index.json'), {
        'built': __import__('datetime').date.today().isoformat(),
        'total': problems,
        'books': books,
        'domains': {d: len(v) for d, v in by_domain.items()},
        'topics': topic_count,
        'topicFiles': {k: sorted(v) for k, v in topic_dom.items()}
    })
    print('параграфів:', total, '| задач:', problems, '| тем:', len(topic_count))


def write(path, data):
    io.open(path, 'w', encoding='utf-8', newline='').write(
        json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print('  ', os.path.basename(path), max(1, os.path.getsize(path) // 1024), 'КБ')


main()

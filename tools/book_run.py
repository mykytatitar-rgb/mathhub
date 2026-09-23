# -*- coding: utf-8 -*-
"""Витягти задачі з книжок каталогу в tools/books/raw.

    python tools/book_run.py            — усі книжки, яких ще немає у raw
    python tools/book_run.py m8a16 igcse — лише названі (перезаписує)

Сканованим книжкам (ocr: true) текст беремо з кеша розпізнавання —
див. tools/book_ocr.py, який треба прогнати раніше.
"""
import io
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import book_extract

SRC = os.path.join(HERE, 'books')
RAW = os.path.join(SRC, 'raw')


def run(entry):
    bid = entry['id']
    path = entry['path']
    if not os.path.exists(path):
        print(bid, '— файлу немає:', path)
        return False

    scan = None
    if entry.get('ocr'):
        scan = (bid, (entry.get('scan') or {}).get('lang', 'ukr+eng'))

    t0 = time.time()
    tasks, n_ans, mode = book_extract.extract(
        path,
        entry.get('first', 1),
        entry.get('last'),
        entry.get('mode'),
        scan)

    if not os.path.isdir(RAW):
        os.makedirs(RAW)
    out = os.path.join(RAW, bid + '.json')
    io.open(out, 'w', encoding='utf-8', newline='').write(
        json.dumps({'id': bid, 'file': path, 'mode': mode, 'tasks': tasks},
                   ensure_ascii=False, indent=1))

    with_ans = sum(1 for t in tasks if t.get('a'))
    print('%-9s нумерація %s | задач %5d | з відповіддю %5d | з рисунком %4d | %d с'
          % (bid, mode, len(tasks), with_ans, sum(1 for t in tasks if t.get('fig')), time.time() - t0))
    return True


def main():
    catalog = json.load(io.open(os.path.join(SRC, 'catalog.json'), encoding='utf-8'))
    want = set(sys.argv[1:])
    for entry in catalog:
        bid = entry['id']
        if want:
            if bid not in want:
                continue
        elif os.path.exists(os.path.join(RAW, bid + '.json')):
            continue
        try:
            run(entry)
        except Exception as e:
            print(bid, '— не вийшло:', e)


if __name__ == '__main__':
    main()

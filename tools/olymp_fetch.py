# -*- coding: utf-8 -*-
"""Забрати олімпіадні задачі з відкритих наборів у сирий кеш.

Джерела — лише ті, що дозволено брати: ліцензія Apache-2.0, автор указаний
у кожній задачі полем source. Завантажуємо через публічний API Hugging Face
(datasets-server), сторінками по 100 рядків, і складаємо як є у .jsonl.

Кеш навмисно окремим кроком: розбір і прив'язка до тем карти змінюються
часто, а качати одне й те саме по десять разів — і довго, і нечемно.

Запуск:  python tools/olymp_fetch.py <куди складати>
"""

import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request

API = 'https://datasets-server.huggingface.co/rows'
PAGE = 100

# набір, конфігурація, розділ
SETS = [
    ('KbsdJames/Omni-MATH', 'default', 'test'),
]


def fetch(dataset, config, split, offset, length):
    url = API + '?' + urllib.parse.urlencode({
        'dataset': dataset, 'config': config, 'split': split,
        'offset': offset, 'length': length
    })
    req = urllib.request.Request(url, headers={'User-Agent': 'vektor-olymp-import'})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            if attempt == 4:
                raise
            time.sleep(2 * (attempt + 1))
            print('  повтор (%s)' % e, flush=True)


def grab(dataset, config, split, out_dir):
    name = dataset.replace('/', '__') + '.jsonl'
    path = os.path.join(out_dir, name)
    have = 0
    if os.path.exists(path):
        with io.open(path, encoding='utf-8') as f:
            have = sum(1 for _ in f)

    head = fetch(dataset, config, split, 0, 1)
    total = head['num_rows_total']
    print('%s: усього %d, уже є %d' % (dataset, total, have), flush=True)
    if have >= total:
        return path

    with io.open(path, 'a', encoding='utf-8', newline='') as f:
        offset = have
        while offset < total:
            page = fetch(dataset, config, split, offset, PAGE)
            rows = page.get('rows') or []
            if not rows:
                break
            for r in rows:
                f.write(json.dumps(r['row'], ensure_ascii=False) + '\n')
            f.flush()
            offset += len(rows)
            print('  %d / %d' % (offset, total), flush=True)
    return path


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)
    for dataset, config, split in SETS:
        grab(dataset, config, split, out_dir)
    print('готово', flush=True)


main()

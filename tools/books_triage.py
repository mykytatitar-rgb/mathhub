# -*- coding: utf-8 -*-
"""Які підручники читаються текстом, а які лежать сканами.

Сканована книжка теж корисна, але дорога: її сторінки доводиться дивитись
очима. Тому спершу розділяємо: з текстового шару задачі беруться одразу й
безкоштовно, скани лишаємо на потім і на вибрані розділи.

Запуск:  python tools/books_triage.py <опис.json> <результат.json>
"""

import io
import json
import os
import re
import subprocess
import sys


def sample(path):
    """Скільки тексту дає книжка на пробі з кількох місць."""
    total = 0
    for first in (12, 60, 120):
        try:
            out = subprocess.run(
                ['pdftotext', '-f', str(first), '-l', str(first + 3), '-enc', 'UTF-8', path, '-'],
                capture_output=True, timeout=60)
            total += len(out.stdout.decode('utf-8', 'ignore').strip())
        except Exception:
            pass
    return total


def main():
    books = json.load(io.open(sys.argv[1], encoding='utf-8'))
    out = []
    for i, b in enumerate(books):
        n = sample(b['path'])
        b['text'] = n
        b['kind'] = 'текст' if n > 1500 else ('мало тексту' if n > 200 else 'скан')
        out.append(b)
        if (i + 1) % 50 == 0:
            print('  ', i + 1, 'з', len(books), flush=True)

    io.open(sys.argv[2], 'w', encoding='utf-8', newline='').write(
        json.dumps(out, ensure_ascii=False, indent=1))

    counts = {}
    for b in out:
        counts[b['kind']] = counts.get(b['kind'], 0) + 1
    print('підсумок:', counts)


main()

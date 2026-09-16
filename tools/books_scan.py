# -*- coding: utf-8 -*-
"""Перепис підручників: що лежить у теці й що з цього математика.

У теці завантажень тисячі файлів — від підручників до рахунків. Ручний
перегляд тут неможливий, тому дивимось у сам файл: перші сторінки й зміст
кажуть про книжку більше, ніж її назва (а назви бувають на кшталт
«194317______.pdf»).

Потрібен pdftotext (є в комплекті Git for Windows).

Запуск:  python tools/books_scan.py <тека> <куди скласти опис.json>
"""

import io
import json
import os
import re
import subprocess
import sys

MATH_WORDS = [
    'математик', 'алгебр', 'геометр', 'тригономет', 'многочлен', 'рівнянн',
    'функці', 'похідн', 'інтеграл', 'ймовірн', 'комбінатор', 'теорія чисел',
    'mathematic', 'algebra', 'geometry', 'calculus', 'trigonometry', 'analysis',
    'probability', 'statistics', 'combinatorics', 'number theory', 'discrete',
    'linear algebra', 'precalculus', 'математика', 'задачник', 'олімпіад'
]

GRADE = re.compile(r'(\d{1,2})\s*(?:клас|кл\.)', re.I)


def text_of(path, first, last):
    try:
        out = subprocess.run(
            ['pdftotext', '-f', str(first), '-l', str(last), '-enc', 'UTF-8', path, '-'],
            capture_output=True, timeout=90)
        return out.stdout.decode('utf-8', 'ignore')
    except Exception as e:
        return ''


def pages(path):
    try:
        out = subprocess.run(['pdfinfo', path], capture_output=True, timeout=30)
        m = re.search(r'Pages:\s+(\d+)', out.stdout.decode('utf-8', 'ignore'))
        return int(m.group(1)) if m else 0
    except Exception:
        return 0


def main():
    folder = sys.argv[1]
    out_path = sys.argv[2]

    files = []
    for root, dirs, names in os.walk(folder):
        for n in names:
            if n.lower().endswith('.pdf'):
                files.append(os.path.join(root, n))
    files.sort()
    print('файлів:', len(files), flush=True)

    seen_size = {}
    books = []
    for i, f in enumerate(files):
        size = os.path.getsize(f)
        if size < 300 * 1024:            # менше третини мегабайта — це не підручник
            continue
        # однакові копії одного файлу трапляються десятками
        key = (size, os.path.basename(f).lower()[:20])
        if key in seen_size:
            continue
        seen_size[key] = 1

        head = text_of(f, 1, 6)
        low = (head + ' ' + os.path.basename(f)).lower()
        hits = [w for w in MATH_WORDS if w in low]
        if not hits:
            continue

        g = GRADE.search(head) or GRADE.search(os.path.basename(f))
        books.append({
            'path': f,
            'name': os.path.basename(f),
            'size': size,
            'pages': pages(f),
            'grade': int(g.group(1)) if g else None,
            'hits': hits[:6],
            'head': re.sub(r'\s+', ' ', head)[:400]
        })
        if len(books) % 25 == 0:
            print('  знайдено', len(books), 'з', i + 1, 'переглянутих', flush=True)

    books.sort(key=lambda b: -b['size'])
    io.open(out_path, 'w', encoding='utf-8', newline='').write(
        json.dumps(books, ensure_ascii=False, indent=1))
    print('математичних книжок:', len(books))
    print('опис:', out_path)


main()

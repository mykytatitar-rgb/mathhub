# -*- coding: utf-8 -*-
"""Показати сторінки сканованого підручника картинками.

Українські шкільні підручники лежать сканами: тексту в них немає, тож
задачі з них доводиться читати очима. Цей скрипт готує для цього сторінки:
малює їх у PNG і, за потреби, склеює по кілька в одну високу картинку —
так одна сторінка перегляду охоплює цілий розворот задач.

Запуск:
  python tools/book_pages.py <книжка.pdf> <перша>-<остання> <тека> [скільки_в_одній] [dpi]
"""

import os
import sys

import pymupdf


def main():
    path = sys.argv[1]
    span = sys.argv[2]
    out_dir = sys.argv[3]
    per = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    dpi = int(sys.argv[5]) if len(sys.argv) > 5 else 150

    first, last = (int(x) for x in span.split('-')) if '-' in span else (int(span), int(span))
    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)

    doc = pymupdf.open(path)
    last = min(last, doc.page_count)
    base = os.path.splitext(os.path.basename(path))[0][:24].replace(' ', '_')

    made = []
    group = []
    for n in range(first, last + 1):
        pix = doc[n - 1].get_pixmap(dpi=dpi)
        group.append((n, pix))
        if len(group) < per and n < last:
            continue

        if per == 1:
            name = '%s-%03d.png' % (base, group[0][0])
            group[0][1].save(os.path.join(out_dir, name))
        else:
            width = max(p.width for _, p in group)
            height = sum(p.height for _, p in group)
            sheet = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, width, height), False)
            sheet.clear_with(255)
            y = 0
            for _, p in group:
                p.set_origin(0, y)
                sheet.copy(p, p.irect)
                y += p.height
            name = '%s-%03d_%03d.png' % (base, group[0][0], group[-1][0])
            sheet.save(os.path.join(out_dir, name))

        made.append(name)
        group = []

    print('сторінок:', doc.page_count)
    for n in made:
        print(os.path.join(out_dir, n))


main()

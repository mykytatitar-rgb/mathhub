# -*- coding: utf-8 -*-
"""Розпізнати скановану книжку Tesseract-ом і зберегти сторінки в кеш.

У скані немає текстового шару — лише картинки сторінок. Tesseract
повертає слова з координатами, і PyMuPDF складає з них той самий rawdict,
що й для звичайної книжки. Далі все як завжди: book_layout збирає рядки,
book_extract ріже на задачі.

Розпізнавання повільне (кілька секунд на сторінку), тому результат кожної
сторінки лежить у tools/books/ocr/<id>/<номер>.json і вдруге не рахується.

Формули Tesseract не читає — з них виходить каша. Тому сканами добре
заповнюються текстові задачі й геометрія; формульні задачі відсіює
book_build.

Потрібні: Tesseract (UB-Mannheim) і мовні моделі в C:\\ProgramData\\tessdata
(ukr, rus, eng з tessdata_best).

Запуск:  python tools/book_ocr.py <id> [процесів]
"""

import io
import json
import os
import sys
from multiprocessing import Pool

import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESSDATA = os.environ.get('VEKTOR_TESSDATA', r'C:\ProgramData\tessdata')
CACHE = os.path.join(ROOT, 'tools', 'books', 'ocr')


def cache_path(book_id, pno):
    return os.path.join(CACHE, book_id, '%04d.json' % pno)


def ocr_page(path, pno, lang, dpi=300):
    """rawdict однієї сторінки, розпізнаної Tesseract-ом."""
    doc = pymupdf.open(path)
    page = doc[pno]
    tp = page.get_textpage_ocr(language=lang, dpi=dpi, full=True, tessdata=TESSDATA)
    raw = page.get_text('rawdict', textpage=tp)
    # картинки нам не потрібні — лише текст
    raw['blocks'] = [b for b in raw['blocks'] if b.get('type') == 0]
    return raw


def load(book_id, path, pno, lang):
    """З кешу, а якщо там ще немає — розпізнати й покласти."""
    cp = cache_path(book_id, pno)
    if os.path.exists(cp):
        return json.load(io.open(cp, encoding='utf-8'))
    raw = ocr_page(path, pno, lang)
    os.makedirs(os.path.dirname(cp), exist_ok=True)
    io.open(cp, 'w', encoding='utf-8').write(json.dumps(raw, ensure_ascii=False))
    return raw


def _job(args):
    book_id, path, pno, lang = args
    if os.path.exists(cache_path(book_id, pno)):
        return pno, 'є'
    try:
        load(book_id, path, pno, lang)
        return pno, 'ok'
    except Exception as e:                    # одна погана сторінка не зупиняє книжку
        return pno, 'ERR ' + repr(e)[:80]


def main():
    book_id = sys.argv[1]
    procs = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    cat = json.load(io.open(os.path.join(ROOT, 'tools', 'books', 'catalog.json'), encoding='utf-8'))
    book = [b for b in cat if b['id'] == book_id][0]
    lang = book.get('scan', {}).get('lang', 'ukr+eng')
    n = pymupdf.open(book['path']).page_count
    jobs = [(book_id, book['path'], p, lang) for p in range(n)]
    done = 0
    with Pool(procs) as pool:
        for pno, msg in pool.imap_unordered(_job, jobs):
            done += 1
            if msg.startswith('ERR') or done % 25 == 0:
                print(book_id, done, '/', n, msg, flush=True)
    print(book_id, 'готово', n, 'сторінок', flush=True)


if __name__ == '__main__':
    main()

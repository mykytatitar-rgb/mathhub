# -*- coding: utf-8 -*-
"""Відновити текст сторінки підручника разом із формулами.

Текстовий шар PDF зберігає символи, але не формули: степінь — це просто
дрібна цифра трохи вище рядка, дріб — дві групи символів над і під
лінією, а PyMuPDF розносить їх по різних «рядках». Прочитаний у лоб,
«y = ½ f(x)» перетворюється на «y f x = 1 2 ( )».

Тут сторінка збирається наново з координат кожного символу:
  • рядки — за спільною базовою лінією основного розміру шрифту;
  • дрібні символи вище базової лінії — степінь, нижче — індекс;
  • символи над і під короткою горизонтальною лінією — чисельник і
    знаменник дробу;
  • велика фігурна дужка на кілька рядків — система;
  • стрілка над буквами — вектор;
  • усе, що лежить усередині рисунків, відкидається.
Формули записуються так, як їх розуміє MathFmt кабінету: $x^{2}$,
$\\frac{1}{2}$, $\\begin{cases}…\\end{cases}$, $\\vec{AB}$.

Окрема біда — шрифти формул. Редактор формул кладе знаки в шрифти Symbol,
MT Extra, «Matematika», а таблиця «який код — яка літера» в PDF часто
неповна: «⩾» приходить як «l», «∞» як «×», «ℝ» як керівний символ \\x1e.
Тому знаки розшифровуються за назвою гліфа у вбудованому шрифті, а де
назви немає — за таблицею відомих підмін.
"""

import io
import re
from collections import Counter

import pymupdf

try:
    from fontTools import agl
    from fontTools.cffLib import CFFFontSet
    from fontTools.ttLib import TTFont
except ImportError:                       # без fontTools просто менше розшифруємо
    agl = CFFFontSet = TTFont = None

MATH_FONT = re.compile(r'Symbol|Math|MT-Extra|Italic|-It\b|Oblique', re.I)
MATH_CHAR = set('=+−–-×·÷<>≤≥≠≈±∓√∞πα∠△°⊥∥∈∉⊂∪∩∅()[]{}|/^_,.;:!\'0123456789′ℕℤℚℝℂ')
CYR = re.compile(r'[А-Яа-яІіЇїЄєҐґЁёЪъЫыЭэ’]')

# ---------------------------------------------------------------------------
# Шрифти формул
# ---------------------------------------------------------------------------

# Кодування шрифту Symbol: латинська літера в ньому — грецька, код 0xB3 — «≥».
_SYM_LOW = {
    0x22: '∀', 0x24: '∃', 0x27: '∋', 0x2A: '∗', 0x2D: '−', 0x40: '≅', 0x5C: '∴', 0x5E: '⊥', 0x7E: '∼',
}
_SYM_LOW.update(zip(range(0x41, 0x5B), 'ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ'))
_SYM_LOW.update(zip(range(0x61, 0x7B), 'αβχδεφγηιϕκλμνοπθρστυϖωξψζ'))
_SYM_HIGH = dict(zip(range(0xA1, 0xE6),
    'ϒ′≤⁄∞ƒ♣♦♥♠↔←↑→↓°±″≥×∝∂•÷≠≡≈…|—↵ℵℑℜ℘⊗⊕∅∩∪⊃⊇⊄⊂⊆∈∉∠∇®©™∏√⋅¬∧∨⇔⇐⇑⇒⇓◊〈®©™∑'))
_SYM_HIGH.update({0xF1: '〉', 0xF2: '∫', 0xF3: '⌠', 0xF4: '⎮', 0xF5: '⌡'})
# частини великих дужок — як у PUA Apple: ліві з 0xF8EB, праві з 0xF8F6
for _code in range(0xE6, 0xF0):
    _SYM_HIGH[_code] = chr(0xF805 + _code)
for _code in range(0xF6, 0xFF):
    _SYM_HIGH[_code] = chr(0xF800 + _code)

# Латиниця-1, яка в шрифті Symbol точно не означає себе (° ± × • збігаються — їх не чіпаємо).
_SYM_GARBAGE = set(chr(c) for c in range(0xA1, 0xFF)) - set('°±×•\xad')

# Частини великих дужок: верх, середина, низ, продовження.
PIECES = {}
for _ch, _cls in zip(range(0xF8EB, 0xF8FF), '((([[[{{{{ )))]]]}}}'):
    if _cls != ' ':
        PIECES[chr(_ch)] = _cls
PIECE_TOP = set('')
PIECE_BOTTOM = set('')

GLYPH_NAMES = {
    'Rbb': 'ℝ', 'Zbb': 'ℤ', 'Cbb': 'ℂ', 'Qbb': 'ℚ', 'Nbb': 'ℕ',
    'parallelto': '∥', 'ringoperator': '∘', 'vertellipsis': '⋮', 'union': '∪',
    'intersection': '∩', 'ellipsis': '…', 'similar': '∽', 'minute': '′', 'second': '″',
    'arrowrightnosp': 'VEC', 'combarrowextender': 'VEC', 'arrowleftnosp': 'VEC',
    'dncurlybracketleft': '', 'dncurlybracketmid': '', 'dncurlybracketright': '',
    'upcurlybracketleft': '', 'upcurlybracketmid': '', 'upcurlybracketright': '',
    'horizcurlybracketext': '', 'nobreakspace': ' ', 'nbspace': ' ',
}
PUA_EXTRA = {'': 'ℝ', '': 'ℤ', '': 'ℂ', '': 'ℚ', '': 'ℕ'}

# Шрифти, у яких звичайні коди означають зовсім інші знаки.
FAMILY = {
    'Matematika': {'l': '≥', 'm': '≤', 'Ÿ': '∪', '×': '∞', 'æ': '·', '"': '∽', 'R': '′',
                   'C': '∥', 'O': '‰', '\xa0': ' '},
    'MathA': {'I': '≥', 'J': '≤'},
}
DROP_FONTS = re.compile(r'Wingdings|Webdings|Dingbat|ZapfDingbats', re.I)


def _charset(doc, xref, cache):
    """Назви гліфів вбудованого шрифту за їхніми номерами."""
    if xref in cache:
        return cache[xref]
    names = None
    if CFFFontSet is not None:
        try:
            _, ext, _, buf = doc.extract_font(xref)
            if ext == 'cff':
                cff = CFFFontSet()
                cff.decompile(io.BytesIO(buf), None)
                names = list(cff[cff.fontNames[0]].charset)
            elif ext in ('ttf', 'otf'):
                names = TTFont(io.BytesIO(buf)).getGlyphOrder()
        except Exception:
            names = None
    cache[xref] = names
    return names


def _glyph_name(page, base, gid, cache):
    """Назва гліфа за номером — якщо всі однойменні шрифти сторінки кажуть те саме."""
    fonts = cache.setdefault(('page', page.number), page.get_fonts(full=True))
    found = set()
    for f in fonts:
        if f[3].split('+')[-1] != base:
            continue
        names = _charset(page.parent, f[0], cache)
        if names and 0 <= gid < len(names):
            found.add(names[gid])
    return found.pop() if len(found) == 1 else None


def _fix_char(ch, gid, base, page, cache):
    """Справжній знак замість того, що записано в текстовому шарі."""
    if DROP_FONTS.search(base):
        return ''
    if base.startswith('Symbol'):
        code = ord(ch)
        if 0xF020 <= code <= 0xF0FF:
            code -= 0xF000
            return _SYM_HIGH.get(code) or _SYM_LOW.get(code) or chr(code)
        if code in _SYM_LOW and ch.isalpha() or ch in '"$\'*-@\\^~':
            return _SYM_LOW.get(code, ch)
        if ch in _SYM_GARBAGE:
            return _SYM_HIGH.get(code, ch)
        return ch
    for fam, table in FAMILY.items():
        if base.startswith(fam) and ch in table:
            return table[ch]
    code = ord(ch)
    if code < 0x20 or code == 0xFFFD or 0xE000 <= code <= 0xF8FF:
        if ch in PIECES:
            return ch
        name = _glyph_name(page, base, gid, cache)
        if name:
            if name in GLYPH_NAMES:
                return GLYPH_NAMES[name]
            if agl is not None:
                u = agl.toUnicode(name)
                if u and ord(u[0]) >= 0x20 and not 0xE000 <= ord(u[0]) <= 0xF8FF:
                    return u
        if ch in PUA_EXTRA:
            return PUA_EXTRA[ch]
        return ''
    return ch


LOOKALIKE = {'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y', 'к': 'k',
             'т': 'm', 'п': 'n', 'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'К': 'K', 'М': 'M',
             'Н': 'H', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X'}
_LOOK_WORD = re.compile(r'(?<![А-Яа-яІіЇїЄєҐґ’\'])([асеорхукптАВСЕКМНОРТХ]{1,4})(?![А-Яа-яІіЇїЄєҐґ’\'])')


def _latin_vars(span):
    """Змінні, набрані кирилицею: «2ху», «6а(а – 2b)», «∆АВС».

    У деяких книжках курсивні x, y, a набрано українськими х, у, а — на
    око те саме, але пошук і формули ламаються. Беремо лише короткі
    «слова» з літер-двійників, що стоять упритул до цифр, дужок, знаків дій
    або латиниці, чи становлять увесь курсивний фрагмент."""
    out = set()
    short = len(span.strip()) <= 4
    for m in _LOOK_WORD.finditer(span):
        before = span[m.start() - 1] if m.start() else ''
        after = span[m.end()] if m.end() < len(span) else ''
        glued = bool(re.match(r'[\w()\[\]^=+\-–−·:/²³]', before + ' ')) and before.strip() != '' \
            or bool(re.match(r'[\d()\[\]^=+\-–−·:/²³A-Za-z]', after))
        word = m.group(1)
        # «а», «у», «о», «с» окремими словами в курсиві — сполучники й прийменники
        if not glued and not short:
            continue
        if not glued and word.lower() in ('а', 'у', 'о', 'с', 'к') and len(span.strip()) > 1:
            continue
        for k in range(m.start(), m.end()):
            out.add(k)
    return out


def _cp1251(text):
    """«Çàïîâ³äíèêè» → «Заповідники»: текст, записаний не в тому кодуванні."""
    n = len(re.findall(r'[À-ÿ³¿º]', text))
    if n >= 2 and n >= len(re.findall(r'[^\W\d_]', text)) * 0.6 and not CYR.search(text):
        try:
            return text.encode('latin-1').decode('cp1251')
        except (UnicodeEncodeError, UnicodeDecodeError):
            return text
    return text


# ---------------------------------------------------------------------------
# Сторінка
# ---------------------------------------------------------------------------

class Tok:
    __slots__ = ('x0', 'x1', 'y', 'y0', 'y1', 'size', 'text', 'math', 'kind', 'vec', 'sp')

    def __init__(self, x0, x1, y, size, text, math, kind='t', y0=None, y1=None):
        self.x0, self.x1, self.y, self.size = x0, x1, y, size
        self.y0 = y - size if y0 is None else y0
        self.y1 = y if y1 is None else y1
        self.text, self.math, self.kind = text, math, kind
        self.vec = None
        self.sp = False


def radicals(drawings, body):
    """Знаки кореня, намальовані лініями: «галочка» й риска над підкореневим виразом.

    У цих книжках √ — не літера шрифту, а многокутник. Без нього «√2/2»
    читалося б як «2/2»."""
    out = []
    for n, d in enumerate(drawings):
        items = d['items']
        if not 3 <= len(items) <= 16 or any(it[0] != 'l' for it in items):
            continue
        r = d['rect']
        if not (body * 0.5 < r.height < body * 5 and r.width > 4):
            continue
        tops = [it for it in items if abs(it[1].y - it[2].y) < 0.3
                and abs(min(it[1].y, it[2].y) - r.y0) < 0.8 and abs(it[2].x - it[1].x) > 2]
        diag = [it for it in items if abs(it[2].x - it[1].x) > 0.8
                and abs(it[2].y - it[1].y) > r.height * 0.6]
        if not tops or not diag:
            continue
        vx0 = min(min(it[1].x, it[2].x) for it in tops)
        if vx0 - r.x0 < 2 or r.x1 - vx0 < 2:
            continue
        out.append((n, r.x0, vx0, r.x1, r.y0, r.y1))
    return out


def figure_boxes(drawings, skip=(), page_rect=None, chars=()):
    """Прямокутники рисунків: великі обʼєкти векторної графіки.

    Не рисунок — рамка чи кольорова підкладка під текстом (у Бевза й Істера
    ними оформлено пів сторінки): у ній багато слів."""
    area = page_rect.width * page_rect.height if page_rect is not None else 0
    # [прямокутник, скільки обʼєктів злито, чи є серед них великий]
    boxes = []
    for n, d in enumerate(drawings):
        if n in skip:
            continue
        r = d['rect']
        if area and r.width * r.height > area * 0.2:
            continue
        big = r.width > 30 and r.height > 30
        pad = 4 if big else 1.5
        boxes.append([pymupdf.Rect(r.x0 - pad, r.y0 - pad, r.x1 + pad, r.y1 + pad), 1, big])
    # злити ті, що перетинаються: рисунок — це купа ліній, а клітинки
    # чи сітка графіка — купа дрібних
    merged = True
    while merged:
        merged = False
        out = []
        for b in boxes:
            for o in out:
                if o[0].intersects(b[0]):
                    o[0] |= b[0]
                    o[1] += b[1]
                    o[2] = o[2] or b[2]
                    merged = True
                    break
            else:
                out.append([pymupdf.Rect(b[0]), b[1], b[2]])
        boxes = out
    boxes = [b[0] for b in boxes
             if b[0].width > 30 and b[0].height > 30 and (b[2] or b[1] >= 6)]
    if chars:
        def wordy(b):
            n = 0
            for c in chars:
                if b.x0 <= c.x0 and c.x1 <= b.x1 and b.y0 <= c.y <= b.y1 and CYR.search(c.text):
                    n += 1
                    if n > 25:
                        return True
            return False
        boxes = [b for b in boxes if not wordy(b)]
    return boxes


def abs_bars(drawings, body, skip=()):
    """Короткі вертикальні лінії заввишки з рядок — риски модуля |x|."""
    out = []
    for n, d in enumerate(drawings):
        if n in skip:
            continue
        for item in d['items']:
            if item[0] == 'l':
                p1, p2 = item[1], item[2]
                h = abs(p2.y - p1.y)
                if abs(p1.x - p2.x) < 0.6 and body * 0.7 < h < body * 1.8:
                    x, y1 = (p1.x + p2.x) / 2, max(p1.y, p2.y)
                    out.append(Tok(x - 0.6, x + 0.6, y1 - body * 0.25, body, '|', True,
                                   y0=min(p1.y, p2.y), y1=y1))
    # модуль — це завжди пара рисок на одній висоті; одинока риска — оформлення на полях
    keep = []
    for t in out:
        mates = [o for o in out if o is not t and abs(o.y1 - t.y1) < 2.5 and abs(o.x0 - t.x0) < body * 15]
        if mates:
            keep.append(t)
    return keep


def fraction_bars(drawings, body, skip=()):
    """Короткі горизонтальні лінії — кандидати в риски дробу."""
    bars = []
    for n, d in enumerate(drawings):
        if n in skip:
            continue
        for item in d['items']:
            if item[0] == 'l':
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 0.6 and 3 < abs(p2.x - p1.x) < body * 16:
                    bars.append((min(p1.x, p2.x), max(p1.x, p2.x), (p1.y + p2.y) / 2))
            elif item[0] == 're':
                r = item[1]
                if r.height < 1.2 and 3 < r.width < body * 16:
                    bars.append((r.x0, r.x1, r.y0 + r.height / 2))
    return bars


def _gids(page):
    """Номери гліфів за точкою початку символу — з трасування тексту.

    Текст беремо з rawdict: там MuPDF уже застосував усі таблиці кодування
    й відновив великі літери. Номер гліфа є лише в трасуванні, а потрібен
    він тільки для знаків, яких таблиця не розшифрувала."""
    out = {}
    for s in page.get_texttrace():
        for c in s['chars']:
            out[(round(c[2][0] * 2), round(c[2][1] * 2))] = c[1]
    return out


def page_chars(page, cache, raw=None):
    """Символи сторінки з розшифрованими знаками формул."""
    chars = []
    gids = None
    for b in (raw or page.get_text('rawdict'))['blocks']:
        if b.get('type') != 0:
            continue
        for l in b['lines']:
            if abs(l['dir'][0] - 1) > 0.01:
                continue                                # повернутий текст — поля, написи збоку
            line_start = len(chars)
            for s in l['spans']:
                base = s['font'].split('+')[-1]
                mathfont = bool(MATH_FONT.search(base))
                size = s['size']
                raw = ''.join(c['c'] for c in s['chars'])
                fixed_span = _cp1251(raw) if not base.startswith(('Symbol', 'Matematika')) else raw
                latin = _latin_vars(fixed_span) if mathfont and len(fixed_span) == len(raw) else ()
                for i, c in enumerate(s['chars']):
                    ch = fixed_span[i] if len(fixed_span) == len(raw) else raw[i]
                    if i in latin:
                        ch = LOOKALIKE[ch]
                    gid = -1
                    code = ord(ch) if len(ch) == 1 else 0x41
                    if code < 0x20 or code == 0xFFFD or (0xE000 <= code <= 0xF8FF and ch not in PIECES):
                        if gids is None:
                            gids = _gids(page)
                        ox, oy = c['origin']
                        gid = gids.get((round(ox * 2), round(oy * 2)), -1)
                    ch = _fix_char(ch, gid, base, page, cache)
                    if ch and not ch.strip():
                        # пробіл сам не токен, але памʼятаємо його: у щільно
                        # вирівняному рядку проміжок між словами буває вужчим за поріг
                        if len(chars) > line_start:
                            chars[-1].sp = True
                        continue
                    if not ch:
                        continue
                    bb = c['bbox']
                    math = (mathfont or ch in PIECES) and not CYR.search(ch)
                    chars.append(Tok(bb[0], bb[2], c['origin'][1], size, ch, math, y0=bb[1], y1=bb[3]))
    return chars


def page_lines(page, cache=None, split=None, raw=None):
    """Рядки сторінки: [(y, розмір, текст із формулами)] зверху вниз.

    split — межа між колонками, знайдена по всій книжці: на окремій
    сторінці малюнок може перекрити смугу між стовпцями, і тоді рядки
    двох колонок склеїлися б в один."""
    cache = {} if cache is None else cache
    chars = page_chars(page, cache, raw)
    if not chars:
        return []

    body = Counter(round(c.size) for c in chars if c.text.strip() and not c.math).most_common(1)
    body = body[0][0] if body else Counter(round(c.size) for c in chars).most_common(1)[0][0]

    drawings = page.get_drawings()
    roots = radicals(drawings, body)
    skip = set(r[0] for r in roots)
    figs = figure_boxes(drawings, skip, page.rect, chars)

    def in_fig(t):
        if t.y < 75:
            return False                     # колонтитул буває на кольоровій смузі
        for f in figs:
            if f.x0 <= t.x0 and t.x1 <= f.x1 and f.y0 <= t.y <= f.y1:
                return True
        return False
    chars = [c for c in chars + abs_bars(drawings, body, skip) if not in_fig(c)]

    # --- дві колонки: у збірниках задачі набрано двома стовпцями ---
    cols = [(-1e9, split), (split, 1e9)] if split else detect_columns(chars, page.rect, body)
    if len(cols) > 1:
        # колонтитул іде через усю сторінку — його не можна різати навпіл
        top, bottom = page.rect.height * 0.08, page.rect.height * 0.93
        head = [c for c in chars if c.y < top or c.y > bottom]
        chars = [c for c in chars if top <= c.y <= bottom]
        out = assemble(head, [], [], body) if head else []
        for lo, hi in cols:
            part = [c for c in chars if lo <= (c.x0 + c.x1) / 2 < hi]
            sub = [r for r in roots if lo <= (r[1] + r[3]) / 2 < hi]
            bars = [b for b in fraction_bars(drawings, body, skip) if lo <= (b[0] + b[1]) / 2 < hi]
            out += assemble(part, bars, sub, body)
        return out
    return assemble(chars, fraction_bars(drawings, body, skip), roots, body)


def detect_columns(chars, rect, body):
    """Чи сторінка в дві колонки — і де між ними порожня смуга.

    У збірниках задачі набрано двома колонками, і прочитані рядком вони
    злипаються: «Найдите периметр отсеченного тре­ лельна общей хорде».
    Колонки шукаємо за порожньою вертикальною смугою посередині."""
    if len(chars) < 80:
        return [(-1e9, 1e9)]
    lo, hi = rect.width * 0.32, rect.width * 0.68
    top, bottom = rect.height * 0.08, rect.height * 0.93
    step = 2.0
    n = int((hi - lo) / step) + 1
    cover = [0] * n
    body_chars = [c for c in chars if top <= c.y <= bottom]
    if len(body_chars) < 60:
        return [(-1e9, 1e9)]
    for c in body_chars:
        i0 = int((c.x0 - lo) / step)
        i1 = int((c.x1 - lo) / step)
        for i in range(max(0, i0), min(n - 1, i1) + 1):
            cover[i] += 1
    best = run = 0
    best_end = -1
    for i in range(n):
        run = run + 1 if cover[i] == 0 else 0
        if run > best:
            best, best_end = run, i
    if best * step < max(9.0, body * 1.1):
        return [(-1e9, 1e9)]
    mid = lo + (best_end - best / 2 + 0.5) * step
    left = sum(1 for c in body_chars if (c.x0 + c.x1) / 2 < mid)
    if left < len(body_chars) * 0.3 or left > len(body_chars) * 0.7:
        return [(-1e9, 1e9)]
    return [(-1e9, mid), (mid, 1e9)]


def assemble(chars, bars, roots, body):
    """Символи однієї колонки — у рядки з формулами."""
    # --- стрілки векторів: мітимо букви під ними ---
    arrows = sorted([c for c in chars if c.text == 'VEC'], key=lambda c: (c.y, c.x0))
    chars = [c for c in chars if c.text != 'VEC']
    spans = []
    for a in arrows:
        if spans and abs(spans[-1][2] - a.y) < 1.5 and a.x0 - spans[-1][1] < 2.5:
            spans[-1][1] = max(spans[-1][1], a.x1)
        else:
            spans.append([a.x0, a.x1, a.y])
    for n, (ax0, ax1, ay) in enumerate(spans):
        for c in chars:
            if c.vec is None and ax0 - 1.5 <= (c.x0 + c.x1) / 2 <= ax1 + 1.5 and 0.15 * body < c.y - ay < 1.5 * body:
                c.vec = n

    # --- великі дужки з частин ---
    pieces = sorted([c for c in chars if c.text in PIECES], key=lambda c: (c.x0, c.y0))
    chars = [c for c in chars if c.text not in PIECES]
    groups = []                                   # [клас, токен, чи вже є низ]
    for p in pieces:
        cls = PIECES[p.text]
        top, bottom = p.text in PIECE_TOP, p.text in PIECE_BOTTOM
        for g in groups:
            if (g[0] == cls and not g[2] and not top and abs(g[1].x0 - p.x0) < 2.5
                    and p.y0 <= g[1].y1 + 3 and p.y1 >= g[1].y0 - 3):
                g[1].y0 = min(g[1].y0, p.y0)
                g[1].y1 = max(g[1].y1, p.y1)
                g[1].x1 = max(g[1].x1, p.x1)
                g[2] = bottom
                break
        else:
            groups.append([cls, Tok(p.x0, p.x1, p.y, body, cls, True, 'delim', p.y0, p.y1), bottom])
    delims, systems = [], []
    for cls, t, _ in groups:
        h = t.y1 - t.y0
        t.y = (t.y0 + t.y1) / 2 + body * 0.35
        if cls in '{[' and h >= body * 1.9:
            systems.append(t)
        else:
            delims.append(t)
    # звичайна дужка, збільшена кеглем, теж буває системою
    for c in list(chars):
        if c.text in '{[' and c.size >= body * 1.7:
            chars.remove(c)
            c.kind = 'delim'
            systems.append(c)

    # --- дроби й корені: від найвужчих до найширших, щоб вкладені склалися першими ---
    used = set()
    tokens = []
    structs = [('frac', b[1] - b[0], b) for b in bars]
    structs += [('root', r[3] - r[1], r) for r in roots]
    for kind, _, st in sorted(structs, key=lambda s: s[1]):
        pool = [c for c in chars + tokens if id(c) not in used]
        if kind == 'root':
            _, rx0, vx0, rx1, ry0, ry1 = st
            under = [c for c in pool if vx0 - 0.5 <= (c.x0 + c.x1) / 2 <= rx1 + 1
                     and ry0 + body * 0.3 < c.y < ry1 + body * 0.35 and c.text != '|']
            if not under:
                continue
            index = [c for c in pool if c.size < body * 0.8 and c.x1 <= vx0 + 0.5 and c.x0 >= rx0 - 1
                     and c.y <= ry0 + (ry1 - ry0) * 0.55 and c not in under]
            for c in under + index:
                used.add(id(c))
            idx = ('[' + render_math(index, body) + ']') if index else ''
            for c in under:
                if c.kind in ('sup', 'sub'):
                    c.kind = 't'
            tokens.append(Tok(rx0, rx1, max(c.y for c in under if c.size >= body * 0.6) if any(
                c.size >= body * 0.6 for c in under) else ry1 - 1.5, body,
                '\\sqrt' + idx + '{' + render_math(under, body) + '}', True, 'frac'))
            continue
        bx0, bx1, by = st
        inside = lambda c: bx0 - 1 <= (c.x0 + c.x1) / 2 <= bx1 + 1
        num = [c for c in pool if inside(c) and by - body * 1.3 < c.y < by - 0.5]
        den = [c for c in pool if inside(c) and by + 0.5 < c.y - c.size * 0.7 < by + body * 1.2]
        # корінь: знак √ упритул ліворуч від риски
        root = [c for c in chars if c.text == '√' and abs(c.x1 - bx0) < 3 and c.y0 - 2 <= by <= c.y1]
        if root and den:
            for c in den:
                used.add(id(c))
            used.add(id(root[0]))
            tokens.append(Tok(root[0].x0, bx1, max(c.y for c in den), body,
                              '\\sqrt{' + render_math(den, body) + '}', True, 'frac'))
            continue
        if not num or not den:
            continue
        if _continues(num, pool, bx0, bx1, body) or _continues(den, pool, bx0, bx1, body):
            continue                          # це не дріб: рядок тексту тягнеться за межі риски
        for c in num + den:
            used.add(id(c))
        tokens.append(Tok(bx0, bx1, by + body * 0.3, body,
                          '\\frac{' + render_math(num, body) + '}{' + render_math(den, body) + '}',
                          True, 'frac'))

    rest = [c for c in chars if id(c) not in used]
    tokens = [t for t in tokens if id(t) not in used]

    # --- рядки за базовою лінією символів основного розміру ---
    mains = sorted([c for c in rest if c.size >= body * 0.8] + tokens, key=lambda t: t.y)
    rows = []
    for c in mains:
        if rows and abs(rows[-1][0] - c.y) <= body * 0.35:
            rows[-1][1].append(c)
        else:
            rows.append([c.y, [c]])

    # дрібні символи — до найближчого рядка, як степінь або індекс
    small = [c for c in rest if c.size < body * 0.8]
    for c in small:
        best = None
        for row in rows:
            d = c.y - row[0]
            if not -body * 0.9 <= d <= body * 0.6:
                continue
            # степінь частіше за індекс; і рядок, де впритул ліворуч стоїть основа, — свій
            score = abs(d) - (1.5 if d < -0.8 else 0)
            if any(abs(t.x1 - c.x0) < 2.5 and t.size >= body * 0.8 for t in row[1]):
                score -= 3
            if best is None or score < best[2]:
                best = (d, row, score)
        if best is None:
            rows.append([c.y, [c]])
            rows.sort(key=lambda r: r[0])
            continue
        d, row, _ = best
        c.kind = 'sup' if d < -0.8 else ('sub' if d > 0.8 else 't')
        row[1].append(c)

    # дужки — до найближчого рядка
    for t in delims:
        if rows:
            min(rows, key=lambda r: abs(r[0] - t.y))[1].append(t)

    # системи: рядки праворуч від великої дужки стають одним записом
    for s in sorted(systems, key=lambda t: t.x0):
        span = [r for r in rows if s.y0 - body * 0.2 <= r[0] <= s.y1 + body * 0.4]
        if len(span) < 2:
            if rows:
                s.text = s.text if s.text != '{' else '\\{'
                min(rows, key=lambda r: abs(r[0] - s.y))[1].append(s)
            continue
        right_edge = min([o.x0 for o in systems
                          if o.x0 > s.x1 + 2 and o.y0 < s.y1 and o.y1 > s.y0] + [1e9])
        taken = []
        for r in span:
            toks = sorted([t for t in r[1] if t.x0 >= s.x1 - 1 and t.x0 < right_edge], key=lambda t: t.x0)
            take, last = [], s.x1
            for k, t in enumerate(toks):
                if t.x0 - last > body * 1.5:
                    break
                if not t.math and CYR.search(t.text):
                    break                      # слова між рядками системи — вже не система
                nxt = toks[k + 1] if k + 1 < len(toks) else None
                if (t.text.isdigit() and nxt is not None and nxt.text == ')'
                        and (not take or t.x0 - last > body * 0.8)):
                    break                      # «3)» — номер наступного пункту
                take.append(t)
                last = t.x1
            if take:
                taken.append((r, take))
        if len(taken) < 2:
            continue
        lines = []
        for r, take in taken:
            for t in take:
                r[1].remove(t)
            lines.append(render_math(take, body))
        if s.text == '[':
            text = '[\\begin{array}{l}' + '\\\\'.join(lines) + '\\end{array}'
        else:
            text = '\\begin{cases}' + '\\\\'.join(lines) + '\\end{cases}'
        target = min(span, key=lambda r: abs(r[0] - (s.y0 + s.y1) / 2))
        target[1].append(Tok(s.x0, max(s.x1, s.x0 + 1), target[0], body, text, True, 'sys'))

    rows.sort(key=lambda r: r[0])
    out = []
    for y, toks in rows:
        if not toks:
            continue
        text = render_row(toks, body)
        if text.strip():
            size = Counter(round(t.size) for t in toks).most_common(1)[0][0]
            out.append((y, size, text))
    return out


def _continues(group, pool, bx0, bx1, body):
    """Чи має група сусідів на тій самій лінії одразу за межами риски."""
    ys = [c.y for c in group]
    for c in pool:
        if c in group or not c.text.strip():
            continue
        if any(abs(c.y - y) < 1.0 for y in ys):
            if bx0 - body * 0.45 <= c.x1 <= bx0 + 0.5 and (c.x0 + c.x1) / 2 < bx0:
                return True
            if bx1 - 0.5 <= c.x0 <= bx1 + body * 0.45 and (c.x0 + c.x1) / 2 > bx1:
                return True
    return False


def _kinds(toks):
    """Степені й індекси всередині невеликої групи (чисельник, рядок системи)."""
    big = [t for t in toks if t.kind in ('t', 'frac', 'sys', 'delim')]
    if not big:
        return
    top = max(t.size for t in big)
    base = Counter(round(t.y) for t in big if t.size >= top * 0.8).most_common(1)[0][0]
    for t in toks:
        if t.kind == 't' and t.size < top * 0.8:
            t.kind = 'sup' if t.y < base - 0.8 else ('sub' if t.y > base + 0.8 else 't')


def render_math(toks, body):
    """Група символів як сама формула, без доларів."""
    _kinds(toks)
    parts = _parts(toks, body)
    s = ''.join(p[0] for p in parts)
    s = s.replace(' ', ' ').replace(' ', ' ').replace(' ', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def _esc(t):
    """Фігурна дужка з книжки — знак, а не групування TeX: «{x | x > 0}»."""
    if t.kind in ('frac', 'sys') or t.text not in ('{', '}'):
        return t.text
    return '\\' + t.text


def _parts(toks, body):
    """Рядок на шматки (текст, чи формула): степені й індекси в {}, вектори в \\vec{}."""
    toks = sorted(toks, key=lambda t: t.x0)
    parts = []
    last_x = None
    prev_sp = False
    i = 0
    while i < len(toks):
        t = toks[i]
        gap = (t.x0 - last_x) if last_x is not None else 0
        if t.kind in ('sup', 'sub'):
            group = [t]
            j = i + 1
            while j < len(toks) and toks[j].kind == t.kind and toks[j].x0 - group[-1].x1 < body * 0.3:
                group.append(toks[j])
                j += 1
            txt = ''.join(_esc(g) for g in group).strip()
            parts.append((('^{' if t.kind == 'sup' else '_{') + txt + '}', True))
            last_x = group[-1].x1
            prev_sp = group[-1].sp
            i = j
            continue
        if t.vec is not None:
            group = [t]
            j = i + 1
            while j < len(toks) and toks[j].vec == t.vec:
                group.append(toks[j])
                j += 1
            if last_x is not None and gap > min(body, t.size) * 0.22:
                parts.append((' ', None))
            parts.append(('\\vec{' + ''.join(g.text for g in group if g.kind == 't').strip() + '}', True))
            last_x = group[-1].x1
            prev_sp = group[-1].sp
            i = j
            continue
        if last_x is not None and (gap > min(body, t.size) * 0.22 or (prev_sp and gap > 0.3)):
            parts.append((' ', None))
        prev_sp = t.sp
        mathy = t.math or t.kind in ('frac', 'sys', 'delim')
        text = _esc(t)
        parts.append((text, mathy if text.strip() else None))
        last_x = t.x1
        i += 1
    return parts


def render_row(toks, body):
    """Рядок у текст: формули — між $."""
    parts = _parts(toks, body)

    # склеїти в текст; послідовності «формульних» шматків загорнути в $…$
    out, buf, inmath = '', '', False

    def close():
        nonlocal out, buf
        # хвіст формули: пробіл чи розділовий знак лишаємо поза нею
        tail = re.search(r'[\s.,;:(\[]*$', buf).group(0)
        body_ = buf[:len(buf) - len(tail)] if tail else buf
        b = body_.strip()
        lead = body_[:len(body_) - len(body_.lstrip())]
        out += lead + ('$' + b + '$' if b else '') + tail
        buf = ''

    for text, mathy in parts:
        if mathy is True or (mathy is None and inmath) or (inmath and text in MATH_CHAR):
            if not inmath:
                # «(3» і «−4» прямим шрифтом перед формулою — її ж початок
                m = re.search(r'(?:^|(?<=\s))[(\[−\-]*[\d,]*$', out)
                head = m.group(0) if m else ''
                if head:
                    out, buf = out[:len(out) - len(head)], head
            inmath = True
            buf += text
        else:
            if inmath:
                close()
                inmath = False
            out += text
    if inmath:
        close()

    out = out.replace(' ', ' ').replace(' ', ' ').replace(' ', ' ')
    out = re.sub(r'\$\s*\$', '', out)
    out = re.sub(r'[ \t]+', ' ', out)
    return out.strip()


if __name__ == '__main__':
    import sys
    doc = pymupdf.open(sys.argv[1])
    cache = {}
    for p in [int(x) for x in sys.argv[2].split(',')]:
        print('=' * 20, 'сторінка', p)
        for y, size, text in page_lines(doc[p - 1], cache):
            print('%6.1f %3d | %s' % (y, size, text))

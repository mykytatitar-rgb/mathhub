# -*- coding: utf-8 -*-
"""Скласти з сирого кешу банк олімпіадних задач для «Вектора».

Що тут відбувається:
  1. читаємо .jsonl, завантажений tools/olymp_fetch.py;
  2. кожній задачі шукаємо теми з карти математики — спершу за рубрикою
     самого набору, потім уточнюємо за словами умови;
  3. розкладаємо по доменах карти й пишемо у assets/data/olymp/.

Умови лишаються мовою оригіналу: перекладати чотири тисячі задач машинно —
значить зіпсувати половину формулювань. Мова набору вказана в index.json.

Запуск:  python tools/olymp_build.py <тека з .jsonl>
"""

import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'data', 'olymp')

# Нижня межа складності за шкалою AoPS. Усе, що нижче, — розминка, а не олімпіада.
MIN_DIFFICULTY = 2

# ------------------------------------------------------------------
# Звідки задачі. Назва джерела стоїть у кожній задачі — це не формальність,
# а повага до тих, хто ці задачі склав і опублікував.
# ------------------------------------------------------------------

SETS = {
    'om': {
        'file': 'KbsdJames__Omni-MATH.jsonl',
        'title': 'Omni-MATH',
        'lang': 'en',
        'license': 'Apache-2.0',
        'url': 'https://huggingface.co/datasets/KbsdJames/Omni-MATH'
    }
}

# Людські назви змагань замість службових ключів набору.
CONTEST = {
    'imo': 'IMO — Міжнародна олімпіада',
    'imo_shortlist': 'IMO Shortlist',
    'imo_longlists': 'IMO Longlist',
    'usamo': 'USAMO — США',
    'usajmo': 'USAJMO — США, молодша',
    'usa_team_selection_test': 'Відбір збірної США',
    'putnam': 'Putnam — студентська, США',
    'imc': 'IMC — студентська міжнародна',
    'HMMT_2': 'HMMT — турнір Гарварда й MIT',
    'HMMT_11': 'HMMT — турнір Гарварда й MIT',
    'HMMT': 'HMMT — турнір Гарварда й MIT',
    'pascal': 'Pascal — конкурс Ватерлоо для 9 кл.',
    'cayley': 'Cayley — конкурс Ватерлоо для 10 кл.',
    'fermat': 'Fermat — конкурс Ватерлоо для 11 кл.',
    'euclid': 'Euclid — конкурс Ватерлоо, випускний',
    'cemc': 'CEMC — Ватерлоо',
    'china_national_olympiad': 'Олімпіада Китаю',
    'china_team_selection_test': 'Відбір збірної Китаю',
    'apmoapmo_sol': 'APMO — Азійсько-Тихоокеанська',
    'apmo': 'APMO — Азійсько-Тихоокеанська',
    'balkan_mo': 'Балканська олімпіада',
    'balkan_mo_shortlist': 'Балканська олімпіада, шортліст',
    'baltic_way': 'Baltic Way',
    'ToT': 'Турнір міст',
    'problems_from_the_kmal_magazine': 'KöMaL — угорський журнал',
    'jbmo': 'JBMO — Балканська, молодша',
    'jbmo_shortlist': 'JBMO, шортліст',
    'imo_shortlist_2': 'IMO Shortlist',
    'iberoamerican': 'Іберо-американська олімпіада',
    'canada_national_olympiad': 'Олімпіада Канади',
    'olympiads_ref': 'Олімпіадна збірка'
}

# ------------------------------------------------------------------
# Рубрика набору → теми карти. Найточніший рядок перемагає: у наборі
# рубрики йдуть від загального до часткового, тому шукаємо з кінця.
# ------------------------------------------------------------------

BY_DOMAIN = [
    ('Plane Geometry -> Triangulations', ['geo.triangles', 'geo.olympiad']),
    ('Plane Geometry -> Polygons', ['geo.polygons', 'geo.quads']),
    ('Plane Geometry -> Angles', ['geo.angles', 'geo.inscribed']),
    ('Plane Geometry -> Circles', ['geo.circle', 'geo.inscribed']),
    ('Plane Geometry -> Area', ['geo.areas']),
    ('Plane Geometry -> Similarity', ['geo.similarity']),
    ('Plane Geometry', ['geo.olympiad']),
    ('Solid Geometry', ['geo.polyhedra', 'geo.volumes']),
    ('Differential Geometry', ['geo.diffgeo']),
    ('Geometry -> Other', ['geo.olympiad']),

    ('Prealgebra -> Integers', ['arith.integers']),
    ('Prealgebra -> Fractions', ['arith.fractions']),
    ('Prealgebra -> Decimals', ['arith.decimals']),
    ('Prealgebra -> Simple Equations', ['alg.lineq']),
    ('Prealgebra -> Percent', ['arith.percent']),
    ('Prealgebra -> Ratios', ['arith.ratio']),
    ('Prealgebra', ['arith.natural']),

    ('Polynomial Operations', ['alg.polys', 'alg.factoring']),
    ('Algebraic Expressions', ['alg.expressions']),
    ('Sequences and Series', ['alg.sequences']),
    ('Equations and Inequalities', ['alg.quadratic', 'alg.linineq']),
    ('Intermediate Algebra -> Inequalities', ['alg.quadineq']),
    ('Intermediate Algebra -> Complex Numbers', ['alg.complex']),
    ('Intermediate Algebra -> Exponential Functions', ['an.expfn']),
    ('Intermediate Algebra -> Logarithmic Functions', ['an.log', 'an.logfn']),
    ('Intermediate Algebra -> Quadratic Functions', ['an.quadraticfn']),
    ('Intermediate Algebra', ['alg.polynomials']),
    ('Abstract Algebra -> Group Theory', ['alg.groups']),
    ('Abstract Algebra -> Field Theory', ['alg.fields']),
    ('Abstract Algebra -> Ring Theory', ['alg.rings']),
    ('Abstract Algebra', ['alg.groups']),
    ('Linear Algebra -> Matrices', ['alg.matrices']),
    ('Linear Algebra -> Determinants', ['alg.determinants']),
    ('Linear Algebra', ['alg.vectorspaces']),

    ('Number Theory -> Prime Numbers', ['nt.primes']),
    ('Number Theory -> Congruences', ['nt.modular']),
    ('Number Theory -> Factorization', ['arith.divisibility', 'nt.primes']),
    ('Greatest Common Divisors', ['arith.gcd', 'nt.euclid']),
    ('Least Common Multiple', ['arith.gcd']),
    ('Number Theory', ['nt.diophantine']),

    ('Graph Theory', ['disc.graphs']),
    ('Algorithms', ['disc.algorithms']),
    ('Discrete Mathematics -> Logic', ['found.statements', 'found.proofs']),
    ('Combinatorics', ['disc.counting', 'disc.combschool']),
    ('Counting Methods -> Combinations', ['disc.combschool']),
    ('Counting Methods', ['disc.counting']),

    ('Probability', ['prob.classical']),
    ('Statistics', ['prob.data']),

    ('Precalculus -> Trigonometric Functions', ['an.trigfn', 'an.trigidentities']),
    ('Precalculus -> Functions', ['an.fnconcept', 'an.fnprops']),
    ('Precalculus -> Limits', ['an.limitintro']),
    ('Precalculus', ['an.fnprops']),
    ('Differential Calculus', ['an.derivative', 'an.diffrules']),
    ('Integral Calculus', ['an.definite', 'an.integrals']),
    ('Calculus', ['an.derivative']),

    ('Math Word Problems', ['alg.wordproblems']),
    ('Applied Mathematics', ['app.numerical'])
]

# ------------------------------------------------------------------
# Уточнення за словами умови. Рубрика каже «Combinatorics» на сотні задач,
# а репетиторові треба знати, що саме тут: підрахунок, графи чи ігри.
# ------------------------------------------------------------------

BY_WORDS = [
    (r'\btriangle\b|\btriangles\b', ['geo.triangles']),
    (r'\bcircles?\b(?!\s+graph)|circumcircle|incircle|\btangent\b', ['geo.circle']),
    (r'quadrilateral|parallelogram|trapezoid|rhombus', ['geo.quads']),
    (r'\bangle|\bangles\b|bisector', ['geo.angles']),
    (r'\barea\b|\bareas\b', ['geo.areas']),
    (r'\bvolume\b|\bsphere\b|\bcubes?\b(?! of| root)|tetrahedron|pyramid|\bprism\b',
     ['geo.volumes', 'geo.polyhedra']),
    (r'\bvector', ['geo.vectors']),
    (r'coordinate|\bplane\b.*\baxis\b', ['geo.coords']),
    (r'similar triangles|are similar\b', ['geo.similarity']),
    (r'Pythagorean|right triangle', ['geo.pythagoras', 'geo.righttrig']),

    (r'\bprime\b|\bprimes\b', ['nt.primes']),
    (r'divisib|\bdivisor|\bdivides\b|multiple of', ['arith.divisibility']),
    (r'remainder|modulo|\bmod\b|congruen', ['nt.modular']),
    (r'\bgcd\b|greatest common divisor|\blcm\b', ['arith.gcd']),
    (r'integer solutions|diophantine', ['nt.diophantine']),

    (r'how many ways|number of ways|arrangements|permutation', ['disc.combschool']),
    (r'\bvertices\b|\bedges\b|connected graph|directed graph|bipartite|\btournament\b',
     ['disc.graphs']),
    (r'probability', ['prob.classical']),
    (r'expected value|expectation', ['prob.rv']),

    (r'polynomial', ['alg.polys']),
    (r'\bsequence\b|arithmetic progression|geometric progression|\bfibonacci\b', ['alg.sequences']),
    (r'inequality|prove that.*\\geq|\\ge |\\leq ', ['alg.quadineq']),
    (r'\bfunction f\b|f\(x\)|functional equation', ['an.fnprops']),
    (r'\blogarithm|\\log', ['an.log']),
    (r'\bsin\b|\bcos\b|\\sin|\\cos|trigonometr', ['an.trigfn']),
    (r'derivative|\\frac{d}{dx}', ['an.derivative']),
    (r'\bintegral\b|\\int', ['an.definite']),
    (r'\bpercent|\\%', ['arith.percent']),
    (r'\bspeed\b|\btravel|\bwork together\b|\bfills the\b', ['alg.wordproblems']),
    (r'\bgame\b|\bplayer\b|\bwins\b|\bstrategy\b', ['app.games', 'disc.counting'])
]


def topics_for(domains, text):
    """Теми карти для однієї задачі.

    Повертає два списки. Перший — з рубрики самого набору: її ставила
    людина, і вона надійна. Другий — здогад за словами умови: він ловить
    те, чого рубрика не розрізняє, але помиляється частіше («circle
    graph» — це діаграма, а не коло). Тому вони не змішуються: у темі
    карти спершу показуємо задачі з надійної прив'язки.
    """
    main = []
    guess = []

    def add(into, ids):
        for t in ids:
            if t not in main and t not in guess:
                into.append(t)

    for d in domains or []:
        for key, ids in BY_DOMAIN:
            if key in d:
                add(main, ids)
                break

    low = text.lower()
    for pattern, ids in BY_WORDS:
        if re.search(pattern, low):
            add(guess, ids)

    return main, guess


FIG = re.compile(r'\[asy\][\s\S]*?\[/asy\]', re.I)


def clean(t):
    """Прибрати код рисунка: показати його ми все одно не можемо."""
    t = (t or '').strip()
    had = bool(FIG.search(t))
    t = FIG.sub(' ', t)
    t = re.sub(r'[ \t]{2,}', ' ', t)
    return t.strip(), had


def main():
    raw_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    if not os.path.isdir(OUT):
        os.makedirs(OUT)

    # довідник тем карти — щоб жодна прив'язка не вказувала в порожнечу
    import subprocess
    js = ("global.window={};require('" + ROOT.replace(chr(92), '/') +
          "/assets/js/mathmap-data.js');" +
          "var M=window.MATH_MAP,s={};M.sections.forEach(function(x){s[x.id]=x;});" +
          "console.log(JSON.stringify(M.topics.map(function(t){" +
          "return [t.id,t.stage,s[t.section].domain];})));")
    out = subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=ROOT)
    known = {}
    for tid, stage, dom in json.loads(out.stdout):
        known[tid] = {'stage': stage, 'dom': dom}

    by_domain = {}
    solutions = {}
    topic_count = {}
    topic_dom = {}
    source_count = {}
    seen = set()
    bad_topic = set()
    n = 0
    skipped = 0

    for prefix, meta in SETS.items():
        path = os.path.join(raw_dir, meta['file'])
        for idx, line in enumerate(io.open(path, encoding='utf-8')):
            r = json.loads(line)
            text, had_fig = clean(r.get('problem'))
            if len(text) < 20:
                skipped += 1
                continue

            # Складність нижче 2 — це розминкові питання конкурсів Ватерлоо:
            # «обчисліть (5−2)/(2+1)». Олімпіадою їх назвати не можна, і в
            # банку олімпіадних задач вони лише принижують решту.
            if float(r.get('difficulty') or 0) < MIN_DIFFICULTY:
                skipped += 1
                continue

            key = re.sub(r'\W+', '', text.lower())[:120]
            if key in seen:
                skipped += 1
                continue
            seen.add(key)

            main, guess = topics_for(r.get('domain'), text)

            # Індукцію умова майже ніколи не називає — її видно з розвʼязання.
            # Тож для цієї теми дивимось і туди.
            if re.search(r'\binduction\b|\binductive(ly)? (step|hypothesis)', (r.get('solution') or '').lower()):
                if 'found.induction' not in main and 'found.induction' not in guess:
                    guess.append('found.induction')
            for t in main + guess:
                if t not in known:
                    bad_topic.add(t)
            main = [t for t in main if t in known]
            guess = [t for t in guess if t in known]
            if not main and not guess:
                main = ['disc.counting']          # без теми задача загубилася б
            tops = main + guess

            pid = prefix + str(idx).zfill(4)
            src = r.get('source') or 'unknown'
            item = {
                'i': pid,
                'p': text,
                'a': (r.get('answer') or '').strip(),
                'd': round(float(r.get('difficulty') or 0), 2),
                's': src,
                't': tops
            }
            item['n'] = len(main)                # скільки перших тем — надійні
            if had_fig:
                item['f'] = 1

            dom = known[(main or guess)[0]]['dom']
            by_domain.setdefault(dom, []).append(item)
            solutions.setdefault(dom, {})[pid] = (r.get('solution') or '').strip()

            for t in tops:
                topic_count[t] = topic_count.get(t, 0) + 1
                # у якому файлі шукати задачі теми: задача лежить у домені
                # своєї першої теми, а позначена буває й чужими
                topic_dom.setdefault(t, set()).add(dom)
            source_count[src] = source_count.get(src, 0) + 1
            n += 1

    for dom, items in by_domain.items():
        items.sort(key=lambda x: (x['d'], x['i']))
        write(os.path.join(OUT, dom + '.json'), items)
        write(os.path.join(OUT, 'sol-' + dom + '.json'), solutions[dom])

    index = {
        'built': __import__('datetime').date.today().isoformat(),
        'total': n,
        'sets': {k: {'title': v['title'], 'lang': v['lang'],
                     'license': v['license'], 'url': v['url']} for k, v in SETS.items()},
        'contests': {k: CONTEST.get(k, k.replace('_', ' ')) for k in source_count},
        'sourceCount': source_count,
        'domains': {d: len(v) for d, v in by_domain.items()},
        'topics': topic_count,
        'topicFiles': {k: sorted(v) for k, v in topic_dom.items()}
    }
    write(os.path.join(OUT, 'index.json'), index)

    print('задач:', n, '| пропущено:', skipped)
    print('доменів:', len(by_domain), '| тем із задачами:', len(topic_count))
    if bad_topic:
        print('УВАГА, невідомі теми:', sorted(bad_topic))


def write(path, data):
    io.open(path, 'w', encoding='utf-8', newline='').write(
        json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print('  ', os.path.basename(path), os.path.getsize(path) // 1024, 'КБ')


def seal():
    """Сайт бачить лише зашифровані копії банку (assets/bank) — оновлюємо їх."""
    here = os.path.dirname(os.path.abspath(__file__))
    try:
        subprocess.run(['node', os.path.join(here, 'bank_seal.js')], check=True)
    except Exception as e:
        print('УВАГА: банк не зашифровано — запустіть node tools/bank_seal.js:', e)


main()
seal()

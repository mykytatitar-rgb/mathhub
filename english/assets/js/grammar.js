/* Anglo — розширена теорія за уроками (перекриває коротке правило з data.js).
   Наповнюється партіями. Ключ = id уроку. HTML у .grammar-body. */
const GRAMMAR = {
  1: `<p>Питання-Wh: питальне слово + допоміжне дієслово + підмет: <b>What</b> do you want? · <b>Where</b> is he?</p>
<table class="gtab"><tr><th>Слово</th><th>Значення</th></tr>
<tr><td>what</td><td>що / який</td></tr>
<tr><td>who</td><td>хто</td></tr>
<tr><td>where</td><td>де</td></tr>
<tr><td>when</td><td>коли</td></tr>
<tr><td>why</td><td>чому</td></tr>
<tr><td>how</td><td>як</td></tr></table>
<p>💡 how поєднується: <b>how much</b> (скільки), <b>how many</b> (скільки штук), <b>how old</b> (скільки років).</p>`,

  2: `<p>Особові займенники-підмети:</p>
<table class="gtab"><tr><th>Однина</th><th>Множина</th></tr>
<tr><td>I — я</td><td>we — ми</td></tr>
<tr><td>you — ти/ви</td><td>you — ви</td></tr>
<tr><td>he / she / it</td><td>they — вони</td></tr></table>
<p><b>Обов’язково:</b> підмет не пропускають — <b>It</b> is cold (не просто «is cold»).</p>
<p><b>I</b> завжди велика літера. Для речей і тварин — <b>it</b>.</p>`,

  3: `<p>1–12 вивчаємо напам’ять. Множина іменника — додай <b>-s</b>: one cat → two cat<b>s</b>.</p>
<p>Число ставимо <b>перед</b> іменником: <b>two</b> brothers.</p>
<p>💡 Вік кажуть через to be: I <b>am</b> five (мені 5), а не «I have».</p>`,

  4: `<p>13–19 закінчуються на <b>-teen</b>, десятки — на <b>-ty</b>:</p>
<table class="gtab"><tr><th>-teen</th><th>-ty</th></tr>
<tr><td>fourteen (14)</td><td>forty (40)</td></tr>
<tr><td>fifteen (15)</td><td>fifty (50)</td></tr></table>
<p>Складені — через <b>дефіс</b>: twenty-<b>one</b> (21), thirty-<b>five</b> (35). Сотня — <b>one hundred</b>.</p>
<p>💡 Не плутай наголос: thir<b>teen</b> (13) vs <b>thir</b>ty (30).</p>`,

  5: `<p>Ввічливість — основа спілкування 🙂</p>
<table class="gtab"><tr><th>Фраза</th><th>Значення</th></tr>
<tr><td>hello / hi</td><td>привіт</td></tr>
<tr><td>please</td><td>будь ласка</td></tr>
<tr><td>thank you</td><td>дякую</td></tr>
<tr><td>sorry</td><td>вибач</td></tr></table>
<p><b>Знайомство:</b> My name <b>is</b> Anna. Питання: What is your name?</p>
<p>«Як справи?» — How are you?</p>`,

  6: `<p><b>this / these</b> — близько, <b>that / those</b> — далеко:</p>
<table class="gtab"><tr><th></th><th>одн.</th><th>мн.</th></tr>
<tr><td>близько</td><td>this</td><td>these</td></tr>
<tr><td>далеко</td><td>that</td><td>those</td></tr></table>
<p><b>this</b> book (ця книга) → <b>these</b> books (ці книги).</p>
<p>💡 По телефону кажуть: <b>This is</b> Anna (це Анна).</p>`,

  7: `<p><b>be</b> = «бути» — найважливіше дієслово. Теперішній час має 3 форми:</p>
<table class="gtab"><tr><th>Особа</th><th>Форма</th></tr>
<tr><td>I</td><td>am</td></tr>
<tr><td>he / she / it</td><td>is</td></tr>
<tr><td>you / we / they</td><td>are</td></tr></table>
<p>Минулий: <b>was</b> (I/he/she) / <b>were</b> (you/we/they). Майбутнє: <b>will be</b>.</p>
<p>💡 Скорочення: I<b>'m</b>, you<b>'re</b>, he<b>'s</b>, it<b>'s</b>.</p>`,

  8: `<p>У теперішньому часі для <b>he/she/it</b> додаємо <b>-s</b>: I work → she work<b>s</b>; I go → he go<b>es</b>.</p>
<p>Питання й заперечення — через <b>do / does</b>:</p>
<table class="gtab"><tr><th>Тип</th><th>Приклад</th></tr>
<tr><td>питання</td><td><b>Do</b> you like it?</td></tr>
<tr><td>заперечення</td><td>I <b>don't</b> know.</td></tr>
<tr><td>3-я особа</td><td><b>Does</b> she work?</td></tr></table>`,

  9: `<p>Присвійні займенники (чий?):</p>
<table class="gtab"><tr><th>Укр</th><th>Англ</th></tr>
<tr><td>мій</td><td>my</td></tr>
<tr><td>твій / ваш</td><td>your</td></tr>
<tr><td>його</td><td>his</td></tr>
<tr><td>її</td><td>her</td></tr></table>
<p>This is <b>my</b> mother. Присвійний <b>'s</b>: Anna<b>'s</b> brother (брат Анни).</p>`,

  10: `<p>Колір — прикметник, стоїть <b>перед</b> іменником і <b>не</b> змінюється: two <b>red</b> cars (не «reds»).</p>
<p>a <b>blue</b> car, <b>white</b> shoes.</p>
<p>💡 Питання про колір: What colour is it? — It is green.</p>`,

  11: `<p>Дні — <b>з великої</b> літери, з прийменником <b>on</b>: <b>on</b> Monday, <b>on</b> Friday.</p>
<p>Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.</p>
<p>«щопонеділка» — on Monday<b>s</b> (у множині).</p>`,

  12: `<p>Місяці — <b>з великої</b> літери, з прийменником <b>in</b>: <b>in</b> July, <b>in</b> winter.</p>
<table class="gtab"><tr><th>Пора року</th><th></th></tr>
<tr><td>spring</td><td>весна</td></tr>
<tr><td>summer</td><td>літо</td></tr>
<tr><td>autumn</td><td>осінь</td></tr>
<tr><td>winter</td><td>зима</td></tr></table>
<p>Конкретна дата — <b>on</b>: on July 5th.</p>`,
};

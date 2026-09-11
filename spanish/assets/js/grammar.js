/* Hola — розширена теорія за уроками (перекриває коротке правило з data.js).
   Наповнюється партіями. Ключ = id уроку. HTML у .grammar-body. */
const GRAMMAR = {
  1: `<p>Іспанські питальні слова на письмі мають <b>наголос-акцент</b>: qué, quién, dónde, cuándo, cómo, por qué.</p>
<table class="gtab"><tr><th>Слово</th><th>Значення</th></tr>
<tr><td><b>qué</b></td><td>що / який</td></tr>
<tr><td><b>quién</b></td><td>хто</td></tr>
<tr><td><b>dónde</b></td><td>де</td></tr>
<tr><td><b>cuándo</b></td><td>коли</td></tr>
<tr><td><b>cómo</b></td><td>як</td></tr>
<tr><td><b>por qué</b></td><td>чому</td></tr></table>
<p>Питання беруть у <b>перевернуті знаки</b>: <b>¿</b>Cómo estás<b>?</b></p>
<p>💡 <b>por qué</b> (чому, окремо) і <b>porque</b> (тому що, разом) — різні слова.</p>`,

  2: `<p>Особові займенники-підмети:</p>
<table class="gtab"><tr><th>Однина</th><th>Множина</th></tr>
<tr><td>yo — я</td><td>nosotros — ми</td></tr>
<tr><td>tú — ти</td><td>vosotros — ви (Іспанія)</td></tr>
<tr><td>él / ella — він / вона</td><td>ellos / ellas — вони</td></tr></table>
<p><b>Особливість:</b> займенник часто <b>пропускають</b> — дієслово вже показує особу: <i>hablo</i> = «я говорю».</p>
<p>Ввічливе «Ви» — <b>usted</b> (з дієсловом у 3-й особі): ¿Cómo está usted?</p>`,

  3: `<p>Числа 1–12 вивчаємо напам’ять — далі вони стають цеглинками.</p>
<p><b>uno</b> перед іменником чол. роду скорочується до <b>un</b>: <b>un</b> libro, <b>una</b> casa.</p>
<p>Число ставимо <b>перед</b> іменником: <b>dos</b> hermanos (два брати).</p>
<p>💡 Про вік кажуть дієсловом <b>tener</b> (мати): Tengo cinco <b>años</b> — «маю 5 років».</p>`,

  4: `<p>13–15 — окремі слова (trece, catorce, quince). 16–19 — «10 + одиниця»: <b>dieci</b>séis, <b>dieci</b>siete…</p>
<p>Десятки: veinte (20), treinta (30), cuarenta (40), cincuenta (50)…</p>
<table class="gtab"><tr><th>Діапазон</th><th>Правило</th></tr>
<tr><td>21–29</td><td>одне слово: <b>veinti</b>uno, veintidós</td></tr>
<tr><td>31+</td><td>через <b>y</b>: treinta <b>y</b> uno (31)</td></tr></table>
<p>Сотня: <b>cien</b> (рівно 100), але <b>ciento</b> uno (101).</p>`,

  5: `<p>Базова ввічливість відкриває двері 🙂</p>
<table class="gtab"><tr><th>Фраза</th><th>Коли</th></tr>
<tr><td>hola</td><td>привіт (будь-коли)</td></tr>
<tr><td>buenos días</td><td>доброго ранку</td></tr>
<tr><td>por favor</td><td>будь ласка (прохання)</td></tr>
<tr><td>gracias</td><td>дякую</td></tr></table>
<p><b>Знайомство:</b> <b>Me llamo</b> Ana — «Мене звати Ана» (дослівно «я себе називаю»).</p>
<p>«Як справи?» — ¿Qué tal? або ¿Cómo estás?</p>`,

  8: `<p>Дієслова мають 3 групи за інфінітивом: <b>-ar</b> (hablar), <b>-er</b> (comer), <b>-ir</b> (vivir).</p>
<p>У теперішньому часі закінчення змінюється за особою. Приклад <b>hablar</b> (говорити):</p>
<table class="gtab"><tr><th>Особа</th><th>Форма</th></tr>
<tr><td>yo</td><td>habl<b>o</b></td></tr>
<tr><td>tú</td><td>habl<b>as</b></td></tr>
<tr><td>él/ella</td><td>habl<b>a</b></td></tr>
<tr><td>nosotros</td><td>habl<b>amos</b></td></tr>
<tr><td>ellos</td><td>habl<b>an</b></td></tr></table>
<p>💡 Вивчи 5–6 дієслів напам’ять — далі схема повторюється.</p>`,

  9: `<p>Присвійні (чий?) змінюються за числом:</p>
<table class="gtab"><tr><th>Укр</th><th>Одн.</th><th>Мн.</th></tr>
<tr><td>мій</td><td>mi</td><td>mis</td></tr>
<tr><td>твій</td><td>tu</td><td>tus</td></tr>
<tr><td>його/її</td><td>su</td><td>sus</td></tr></table>
<p>mi hermano (мій брат) → mis hermanos (мої брати).</p>
<p>Багато слів мають пару чол./жін.: herman<b>o</b> / herman<b>a</b>, hij<b>o</b> / hij<b>a</b>.</p>`,

  10: `<p>Колір — це прикметник, стоїть <b>після</b> іменника: la casa <b>roja</b> (червоний дім).</p>
<p>Узгоджується за родом і числом:</p>
<table class="gtab"><tr><th></th><th>чол.</th><th>жін.</th></tr>
<tr><td>одн.</td><td>rojo</td><td>roja</td></tr>
<tr><td>мн.</td><td>rojos</td><td>rojas</td></tr></table>
<p>Кольори на <b>-e</b> / <b>-l</b> не міняють рід: verde, azul (лише число: verdes, azules).</p>`,

  11: `<p>Дні — <b>з малої</b> літери, чоловічого роду, з артиклем <b>el</b>:</p>
<p>lunes, martes, miércoles, jueves, viernes, sábado, domingo.</p>
<p><b>«у понеділок»</b> = <b>el</b> lunes; <b>«щопонеділка»</b> = <b>los</b> lunes.</p>
<p>💡 Дні на -s (lunes…viernes) у множині не змінюються.</p>`,

  12: `<p>Місяці — <b>з малої</b> літери: enero, febrero, marzo…</p>
<p>«у липні» = <b>en</b> julio. «влітку» = <b>en</b> verano.</p>
<table class="gtab"><tr><th>Пора року</th><th></th></tr>
<tr><td>primavera</td><td>весна</td></tr>
<tr><td>verano</td><td>літо</td></tr>
<tr><td>otoño</td><td>осінь</td></tr>
<tr><td>invierno</td><td>зима</td></tr></table>`,

  13: `<p>Артикль залежить від роду: <b>el</b> (чол.) — el pan, <b>la</b> (жін.) — la leche.</p>
<p>«Хочу…» — <b>quiero</b> + слово: Quiero agua (хочу води).</p>
<p>«Мені смакує» — <b>me gusta</b> (одн.) / <b>me gustan</b> (мн.): Me gusta el café; Me gustan las manzanas.</p>`,

  14: `<p>Частини тіла вживають з <b>артиклем</b>, а не з присвійним: Me duele <b>la</b> cabeza (болить голова), не «mi cabeza».</p>
<p>«У мене болить…» — <b>Me duele</b> + одн. / <b>Me duelen</b> + мн.: Me duelen los pies.</p>`,

  15: `<p>«Носити / бути вдягненим» — дієслово <b>llevar</b>: Llevo una camisa (на мені сорочка).</p>
<p>Одяг узгоджується за родом і числом: una camisa <b>blanca</b>, zapatos <b>negros</b>.</p>`,

  16: `<p>Ввічливе замовлення — <b>Quisiera…</b> («я б хотів…») або <b>¿Me trae…?</b></p>
<table class="gtab"><tr><th>Ісп</th><th>Укр</th></tr>
<tr><td>la carta</td><td>меню</td></tr>
<tr><td>la cuenta</td><td>рахунок</td></tr>
<tr><td>¿Cuánto es?</td><td>скільки?</td></tr></table>
<p>«Для мене…» — <b>Para mí</b>, un café.</p>`,

  17: `<p>Котра година: <b>Es la una</b> (1:00), а від 2-х — <b>Son las</b> + число: Son las tres.</p>
<p>Пів / чверть: <b>y media</b> (30 хв), <b>y cuarto</b> (15 хв): Son las dos y media.</p>
<p>«О котрій?» — ¿A qué hora? — <b>A las</b> ocho.</p>`,

  18: `<p>Про погоду кажуть дієсловом <b>hacer</b>: <b>Hace</b> frío (холодно), <b>Hace</b> calor (спекотно), <b>Hace</b> sol.</p>
<p>Дощ/сніг — окремі дієслова: <b>Llueve</b> (іде дощ), <b>Nieva</b> (іде сніг).</p>`,

  19: `<p>«Є» — <b>hay</b> (є взагалі) і <b>está</b> (де саме):</p>
<p><b>Hay</b> una mesa (є стіл). La mesa <b>está</b> en la cocina (стіл на кухні).</p>
<p>Рід кімнат: la cocina, el baño, el dormitorio.</p>`,

  20: `<p>«Де є…?» — <b>¿Dónde está…?</b> Напрямок:</p>
<table class="gtab"><tr><th>Ісп</th><th>Укр</th></tr>
<tr><td>a la derecha</td><td>праворуч</td></tr>
<tr><td>a la izquierda</td><td>ліворуч</td></tr>
<tr><td>todo recto</td><td>прямо</td></tr>
<tr><td>cerca / lejos</td><td>близько / далеко</td></tr></table>`,

  21: `<p>Спосіб пересування — прийменник <b>en</b>: <b>en</b> coche, <b>en</b> tren, <b>en</b> avión.</p>
<p>Виняток: <b>a pie</b> (пішки). «Їхати» — <b>ir</b>: Voy en autobús (їду автобусом).</p>`,

  22: `<p>Ціна: <b>¿Cuánto cuesta?</b> / ¿Cuánto es?</p>
<p>Оплата: pagar <b>con</b> tarjeta (карткою) або <b>en</b> efectivo (готівкою).</p>
<p>«Дешевий/дорогий» — barato / caro (узгоджуються: barat<b>a</b>, car<b>os</b>).</p>`,

  23: `<p>Прикметник стоїть <b>після</b> іменника й узгоджується за родом і числом:</p>
<p>un coche <b>rojo</b>, una casa <b>roja</b>, coches <b>rojos</b>.</p>
<p>Порівняння: <b>más</b> … <b>que</b> (більш ніж), <b>menos</b> … <b>que</b> (менш ніж): más grande que.</p>`,

  24: `<table class="gtab"><tr><th>Ісп</th><th>Укр</th></tr>
<tr><td>en</td><td>в / на</td></tr>
<tr><td>encima de</td><td>над / на</td></tr>
<tr><td>debajo de</td><td>під</td></tr>
<tr><td>al lado de</td><td>поруч з</td></tr>
<tr><td>entre</td><td>між</td></tr></table>
<p>«знаходиться» — <b>estar</b>: El gato está <b>debajo de</b> la mesa.</p>`,
};

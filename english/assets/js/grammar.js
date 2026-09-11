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

  13: `<p>Незлічувані (вода, хліб) не мають множини й артикля <b>a</b>: I drink <b>water</b> (не «a water»).</p>
<p>«Скільки» — <b>how much</b> (незлічуване) / <b>how many</b> (штуки): how much water, how many apples.</p>
<p>«Мені подобається» — I <b>like</b> + слово: I like tea.</p>`,

  14: `<p>Множина частин тіла часто неправильна:</p>
<table class="gtab"><tr><th>Одн.</th><th>Мн.</th></tr>
<tr><td>foot (ступня)</td><td>feet</td></tr>
<tr><td>tooth (зуб)</td><td>teeth</td></tr>
<tr><td>hand</td><td>hands</td></tr></table>
<p>«У мене болить…» — My head <b>hurts</b> або I <b>have a</b> headache.</p>`,

  15: `<p>«Носити / бути вдягненим» — <b>to wear</b>: She <b>wears</b> a hat.</p>
<p>«Одягати» (дія) — <b>to put on</b>: Put on your shoes.</p>
<p>Пара-предмети завжди множина: trousers, glasses, jeans → <b>a pair of</b> trousers.</p>`,

  16: `<p>Ввічливе замовлення: <b>Can I have…?</b> або <b>I'd like…</b> (I would like).</p>
<table class="gtab"><tr><th>Англ</th><th>Укр</th></tr>
<tr><td>the menu</td><td>меню</td></tr>
<tr><td>the bill</td><td>рахунок</td></tr>
<tr><td>How much is it?</td><td>скільки?</td></tr></table>
<p>«Для мене…» — For me, a coffee, please.</p>`,

  17: `<p>Котра година: <b>It is</b> + година: It is five <b>o'clock</b>.</p>
<p>Хвилини: <b>past</b> (по) до 30, <b>to</b> (до) після 30: ten <b>past</b> six (6:10), quarter <b>to</b> seven (6:45).</p>
<p>«О котрій?» — <b>At</b> what time? — <b>At</b> eight.</p>`,

  18: `<p>Про погоду — через <b>It is</b>: It is cold / hot / sunny.</p>
<p>Дія (дощить) — Present Continuous: It <b>is raining</b>, It <b>is snowing</b>.</p>
<p>Питання: What's the weather like?</p>`,

  19: `<p>«Є» — <b>there is</b> (одн.) / <b>there are</b> (мн.): <b>There is</b> a bed, <b>there are</b> two chairs.</p>
<p>Місце — прийменники <b>in / on / under</b>: The cat is <b>in</b> the room.</p>`,

  20: `<p>«Де є…?» — <b>Where is…?</b> Напрямки:</p>
<table class="gtab"><tr><th>Англ</th><th>Укр</th></tr>
<tr><td>on the right</td><td>праворуч</td></tr>
<tr><td>on the left</td><td>ліворуч</td></tr>
<tr><td>straight on</td><td>прямо</td></tr>
<tr><td>near / far</td><td>близько / далеко</td></tr></table>`,

  21: `<p>Спосіб пересування — прийменник <b>by</b>: <b>by</b> car, <b>by</b> bus, <b>by</b> train.</p>
<p>Виняток: <b>on foot</b> (пішки). «Сідати / виходити»: get <b>on</b> / get <b>off</b> the bus.</p>`,

  22: `<p>Ціна: <b>How much is it?</b> Оплата: pay <b>by</b> card / <b>in</b> cash.</p>
<p>«Приміряти» — <b>try on</b>: Can I try it on? Дешевий/дорогий — cheap / expensive.</p>`,

  23: `<p>Прикметник — <b>перед</b> іменником і не змінюється: a <b>big</b> house, <b>big</b> houses.</p>
<p>Ступені порівняння:</p>
<table class="gtab"><tr><th>Тип</th><th>Приклад</th></tr>
<tr><td>короткі +er</td><td>big → big<b>ger</b></td></tr>
<tr><td>довгі + more</td><td><b>more</b> expensive</td></tr>
<tr><td>найвищий</td><td>the big<b>gest</b> / the <b>most</b>…</td></tr></table>`,

  24: `<table class="gtab"><tr><th>Англ</th><th>Укр</th></tr>
<tr><td>in</td><td>в / всередині</td></tr>
<tr><td>on</td><td>на (поверхні)</td></tr>
<tr><td>under</td><td>під</td></tr>
<tr><td>next to</td><td>поруч з</td></tr>
<tr><td>between</td><td>між</td></tr>
<tr><td>behind</td><td>позаду</td></tr></table>
<p>The cat is <b>under</b> the table.</p>`,

  25: `<p>«Їхати до» — <b>go to</b>: I go <b>to</b> London. «Бути в» — be <b>in</b>.</p>
<p>Слова: ticket, airport, hotel, luggage, to book (бронювати).</p>
<p>«Скільки коштує квиток?» — How much is the ticket?</p>`,

  26: `<p>«Працювати ким» — work <b>as</b>: I work <b>as</b> a teacher.</p>
<p>«Чим займаєшся?» — What do you do?</p>
<p>Слова: office, boss, salary, meeting, deadline.</p>`,

  27: `<p>Скарги: My head <b>hurts</b> або I <b>have a</b> headache / a cold.</p>
<p>«Я почуваюся…» — I feel + прикметник: I feel sick / tired.</p>
<p>«Мені треба лікар» — I need a doctor.</p>`,

  29: `<p>Стан і почуття — з <b>to be</b> або <b>feel</b>: I <b>am</b> happy, I <b>feel</b> tired.</p>
<p>Питання: How do you feel? Прикметники не змінюються за родом.</p>`,

  30: `<p>Два способи майбутнього:</p>
<table class="gtab"><tr><th>Форма</th><th>Коли</th></tr>
<tr><td><b>will</b> + дієслово</td><td>рішення / прогноз: I <b>will</b> help.</td></tr>
<tr><td><b>going to</b> + дієслово</td><td>план / намір: I'm <b>going to</b> travel.</td></tr></table>
<p>Скорочення: I'll, he'll, we'll.</p>`,

  31: `<p>Незлічувані слова природи — без «a»: water, air, snow.</p>
<p>Слова: tree, river, mountain, sea, sky, forest, flower.</p>
<p>«Мені подобається природа» — I like nature.</p>`,

  32: `<p>Висловити думку: <b>I think (that)…</b>, <b>In my opinion…</b>, <b>I believe…</b></p>
<p>Згода/незгода: I agree / I don't agree (disagree).</p>
<p>Зв’язки: because (бо), but (але), also (також), however (однак).</p>`,

  33: `<p>Лексика: company, client, contract, meeting, market, profit.</p>
<p>«Домовитись» — to make a deal. «Інвестувати» — to invest.</p>`,

  34: `<p>Теми: government, law, rights, freedom, elections, society.</p>
<p>«Треба / належить» — <b>should</b> / <b>have to</b>: We <b>should</b> vote.</p>`,

  35: `<p>Фразове дієслово — дієслово + прийменник, зі зміненим значенням:</p>
<table class="gtab"><tr><th>Вислів</th><th>Значення</th></tr>
<tr><td>give up</td><td>здатися</td></tr>
<tr><td>look for</td><td>шукати</td></tr>
<tr><td>find out</td><td>дізнатися</td></tr></table>
<p>💡 Вчи їх цілком — значення не складається зі слів.</p>`,

  36: `<p>Багато міжнародних слів: internet, application (app), online, file, password.</p>
<p>«Завантажити / зберегти» — download / save. «Увімкнути / вимкнути» — turn on / turn off.</p>`,

  37: `<p>Множина зазвичай -s: dog → dogs. Але є винятки:</p>
<table class="gtab"><tr><th>Одн.</th><th>Мн.</th></tr>
<tr><td>mouse</td><td>mice</td></tr>
<tr><td>fish</td><td>fish</td></tr>
<tr><td>sheep</td><td>sheep</td></tr></table>`,

  38: `<p>«Люблю робити…» — I like + <b>-ing</b>: I like read<b>ing</b> / swimm<b>ing</b>.</p>
<p>«Грати в гру» — play + гра; «грати на інструменті» — play <b>the</b> guitar.</p>`,

  39: `<p>Ввічливо: <b>Could I have…?</b> / For me, … Рахунок: Can we have the bill?</p>
<p>Слова: starter (закуска), main course (основна), dessert, tip (чайові).</p>`,

  40: `<p><b>learn</b> = вчити(ся), <b>teach</b> = навчати, <b>study</b> = навчатися/вивчати.</p>
<p>Слова: lesson, exam, teacher, homework, mark/grade.</p>`,

  41: `<p>Теми: environment, climate, pollution, energy, to recycle, to protect.</p>
<p>«Ми повинні захищати планету» — We should protect the planet.</p>`,

  42: `<p>Слова: news (завжди однина!), newspaper, article, TV, radio, journalist.</p>
<p>«За даними…» — According to… «Повідомляти» — to report.</p>`,

  43: `<p>Щоденні дії, багато — фразові дієслова:</p>
<table class="gtab"><tr><th>Дієслово</th><th>Значення</th></tr>
<tr><td>get up</td><td>вставати</td></tr>
<tr><td>have breakfast</td><td>снідати</td></tr>
<tr><td>go to bed</td><td>лягати спати</td></tr></table>
<p>3-я особа +s: he get<b>s</b> up.</p>`,

  44: `<p>Питання: <b>How do I get to…?</b></p>
<table class="gtab"><tr><th>Англ</th><th>Укр</th></tr>
<tr><td>turn right / left</td><td>поверни праворуч / ліворуч</td></tr>
<tr><td>go straight</td><td>прямо</td></tr>
<tr><td>corner</td><td>ріг</td></tr></table>`,

  45: `<p>Слова: bank, ATM, letter, stamp (марка), queue (черга), to send.</p>
<p>«Зняти гроші» — withdraw money. «Заповнити форму» — fill in a form.</p>`,

  46: `<p>Слова: science, number, result, question / answer, idea, example.</p>
<p>«Наприклад» — for example. «Отже / тому» — so / therefore.</p>`,

  49: `<p>«Готувати» — cook. Способи: fry (смажити), boil (варити), bake (запікати).</p>
<p>Наказ у рецепті: <b>Add</b> salt; <b>Mix</b> well; <b>Cut</b> the onion.</p>`,

  50: `<p>Слова: party, birthday, gift/present, to celebrate, guest.</p>
<p>«З днем народження!» — Happy birthday! «На вечірці» — at the party.</p>`,

  51: `<p>Країни, мови й національності — <b>з великої</b> літери: England, English, French.</p>
<p>«Говорити мовою» — speak + мова: I speak English.</p>`,

  52: `<p>Слова: friend, neighbour, couple, relationship, to trust, to meet.</p>
<p>Після <b>to</b> — базова форма: I want <b>to meet</b> you.</p>`,

  53: `<p>«Грати в гру» — <b>play</b> football/tennis. «Ходити на…» — go swimm<b>ing</b> / runn<b>ing</b>.</p>
<p>Слова: team, player, goal, to win, to lose, match.</p>`,

  54: `<p>«Грати на інструменті» — play <b>the</b> guitar (з артиклем the).</p>
<p>Слова: music, song, art, picture, artist, concert, to sing, to dance.</p>`,

  55: `<p>Професія — з артиклем <b>a/an</b>: She is <b>a</b> doctor. He is <b>an</b> engineer.</p>
<p>«Ким ти працюєш?» — What do you do? Багато на -er/-or: teacher, actor, driver.</p>`,

  56: `<p>Злічувані (яблука) мають множину: apple → apples. Деякі незлічувані: fruit (зазвичай без -s).</p>
<p>«Мені подобаються…» — I like apples / bananas.</p>`,
};

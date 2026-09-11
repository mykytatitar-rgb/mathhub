/* Deutsch — логіка застосунку.
   SPA на хеш-маршрутах: #/ (рівні й уроки), #/lesson/N.
   Прогрес і налаштування — у localStorage. */

const root = document.getElementById('main');

/* ---------- встановлення застосунку (PWA) ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt = e; });
window.addEventListener('appinstalled', ()=>{ deferredPrompt = null; if(location.hash==='#/'||location.hash==='') renderHome(); });
function isStandalone(){ try{ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true; }catch(e){ return false; } }
async function doInstall(){
  if(deferredPrompt){ deferredPrompt.prompt(); try{ await deferredPrompt.userChoice; }catch(e){} deferredPrompt=null; renderHome(); return; }
  alert('Щоб встановити як окремий застосунок:\n\n• Android (Chrome): меню ⋮ угорі → «Додати на головний екран» / «Встановити застосунок».\n• iPhone (Safari): кнопка «Поділитися» → «На початковий екран».\n\nПотім відкривай його з іконки — він працюватиме як звичайний застосунок, навіть офлайн.');
}

/* ---------- тема (світла / темна / авто) ---------- */
const THEME_KEY = 'deutsch.theme';
function storedTheme(){ try{ return localStorage.getItem(THEME_KEY) || 'auto'; }catch(e){ return 'auto'; } }
function effectiveTheme(){ const t = storedTheme(); if(t==='auto'){ return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; } return t; }
function applyTheme(){ try{ document.documentElement.dataset.theme = effectiveTheme(); }catch(e){} }
function cycleTheme(){ const order=['auto','light','dark']; const nx=order[(order.indexOf(storedTheme())+1)%order.length]; try{ localStorage.setItem(THEME_KEY, nx); }catch(e){} applyTheme(); }
function themeIcon(){ const t=storedTheme(); return t==='auto'?'🌓':(t==='light'?'☀️':'🌙'); }
applyTheme();
if(window.matchMedia){ try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{ if(storedTheme()==='auto') applyTheme(); }); }catch(e){} }

/* ---------- преміум / без реклами ---------- */
const PMKEY = 'deutsch.premium.v1';
function isPremium(){ try{ return localStorage.getItem(PMKEY)==='1'; }catch(e){ return false; } }
function setPremium(v){ try{ v ? localStorage.setItem(PMKEY,'1') : localStorage.removeItem(PMKEY); }catch(e){} }

/* ---------- прогрес ---------- */
const PKEY = 'deutsch.progress.v1';
function loadProgress(){ try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch(e){ return {}; } }
function saveProgress(p){ try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch(e){} }
let progress = loadProgress(); // { lessonId: { "word": true } }

function knownCount(lesson){ const set = progress[lesson.id] || {}; return lesson.cards.filter(c => set[c.en]).length; }
function totalCards(){ return LESSONS.reduce((s,l)=>s+l.cards.length,0); }
function totalKnown(){ return LESSONS.reduce((s,l)=>s+knownCount(l),0); }
function markKnown(lessonId, en, val){
  progress[lessonId] = progress[lessonId] || {};
  if(val) progress[lessonId][en] = true; else delete progress[lessonId][en];
  saveProgress(progress);
}
function markMeta(lessonId, key, val){
  progress[lessonId] = progress[lessonId] || {};
  if(val) progress[lessonId][key] = true; else delete progress[lessonId][key];
  saveProgress(progress);
}

/* ---------- повторення (інтервальне) ---------- */
const RVKEY = 'deutsch.review.v1';
const INTERVALS = [12*3600e3, 24*3600e3, 3*24*3600e3, 7*24*3600e3]; // мс за рівнем streak
function loadReview(){ try{ return JSON.parse(localStorage.getItem(RVKEY)) || {}; }catch(e){ return {}; } }
function saveReview(r){ try{ localStorage.setItem(RVKEY, JSON.stringify(r)); }catch(e){} }
let review = loadReview();
function rvKey(l,en){ return l+'::'+en; }
function addReview(lessonId, c){
  const k = rvKey(lessonId, c.en);
  if(!review[k]) review[k] = { l:lessonId, en:c.en, ua:c.ua, tr:c.tr, streak:0, due:Date.now() };
  else review[k].due = Math.min(review[k].due, Date.now());
  saveReview(review);
}
function reviewDue(){ const now=Date.now(); return Object.values(review).filter(x=>x.due<=now); }
function reviewCount(){ return Object.keys(review).length; }
function gradeReview(k, ok){
  const it = review[k]; if(!it) return;
  if(ok){ it.streak++; if(it.streak>=INTERVALS.length) delete review[k]; else it.due = Date.now()+INTERVALS[it.streak-1]; }
  else { it.streak=0; it.due=Date.now(); }
  saveReview(review);
}

/* ---------- щоденна ціль і стрік ---------- */
const SKEY = 'deutsch.streak.v1';
function ymd(d){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function todayStr(){ return ymd(new Date()); }
function yesterdayStr(){ const d=new Date(); d.setDate(d.getDate()-1); return ymd(d); }
function loadStreak(){ try{ return JSON.parse(localStorage.getItem(SKEY)) || {}; }catch(e){ return {}; } }
let streakData = Object.assign({day:'',count:0,streak:0,goal:10,lastGoalDay:''}, loadStreak());
function saveStreak(){ try{ localStorage.setItem(SKEY, JSON.stringify(streakData)); }catch(e){} }
function todayCount(){ return streakData.day===todayStr() ? streakData.count : 0; }
function displayStreak(){ const t=todayStr(), y=yesterdayStr(); return (streakData.lastGoalDay===t||streakData.lastGoalDay===y) ? streakData.streak : 0; }
function bumpDaily(){
  const t=todayStr();
  if(streakData.day!==t){ streakData.day=t; streakData.count=0; }
  streakData.count++;
  if(streakData.count===streakData.goal){
    streakData.streak = (streakData.lastGoalDay===yesterdayStr()) ? streakData.streak+1 : 1;
    streakData.lastGoalDay=t;
  }
  saveStreak();
}
function cycleGoal(){ const opts=[5,10,15,20]; streakData.goal = opts[(opts.indexOf(streakData.goal)+1)%opts.length] || 10; saveStreak(); }

/* ---------- швидкість озвучки ---------- */
const RKEY = 'deutsch.rate';
const RATES = [ {v:0.7, e:'🐢'}, {v:0.85, e:'🚶'}, {v:1.0, e:'🐇'} ];
function rateIdx(){ let i = parseInt(localStorage.getItem(RKEY),10); return (i>=0 && i<RATES.length) ? i : 1; }
function setRateIdx(i){ try{ localStorage.setItem(RKEY, i); }catch(e){} }

/* ---------- озвучка (TTS): беремо найкращий доступний голос ---------- */
let voice = null;
function scoreVoice(v){
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if(/^de/i.test(v.lang)) s += 3;
  if(/natural|neural|premium|enhanced/.test(n)) s += 6;   // якісні нейроголоси
  if(/google/.test(n)) s += 4;
  if(/microsoft|apple|siri|samantha|daniel/.test(n)) s += 2;
  if(v.localService === false) s += 1;                    // серверні часто кращі
  if(/compact|espeak|robo/.test(n)) s -= 4;               // дешеві синтезатори
  return s;
}
function pickVoice(){
  const vs = (speechSynthesis.getVoices() || []).filter(v => /^de/i.test(v.lang));
  voice = vs.length ? vs.slice().sort((a,b)=>scoreVoice(b)-scoreVoice(a))[0] : null;
}
if('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text){
  if(!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  if(!voice) pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = (voice && voice.lang) || 'de-DE';
  if(voice) u.voice = voice;
  u.rate = RATES[rateIdx()].v;
  u.pitch = 1;
  speechSynthesis.speak(u);
}

/* ---------- утиліти ---------- */
function trHTML(tr){ return tr.replace(/\[([^\]]+)\]/g, '<span class="stress">$1</span>'); }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];} return a; }
function esc(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

/* картинка-емодзі за українським перекладом (ключ — база до коми/дужки) */
const EMOJI = {
  "готувати":"🍳","сковорода":"🍳","духовка":"🔥","смажити":"🍳","варити":"🍲","рецепт":"📋","голодний":"😋","спраглий":"🥤","солодкий":"🍬","сіль":"🧂",
  "свято":"🎉","день народження":"🎂","подарунок":"🎁","вечірка":"🥳","святкувати":"🎉","запрошувати":"✉️","торт":"🎂","гість":"🧑","бажати":"🌟","сюрприз":"🎁",
  "коричневий":"🟤","сірий":"🩶","сир":"🧀","рис":"🍚","кролик":"🐰","миша":"🐭",
  "мова":"🗣️","світ":"🌍","іноземний":"🌐","кордон":"🛂","столиця":"🏛️","прапор":"🚩","нація":"🏳️","рідний":"🏠","континент":"🗺️",
  "друг":"🧑‍🤝‍🧑","сусід":"🏘️","зустрічати":"🤝","разом":"👥","сам":"🧍","довіряти":"🤝","стосунки":"❤️","пара":"💑","ділитися":"🤲","близький":"🤗",
  "палець":"👆","зуб":"🦷","пояс":"🔗","окуляри":"👓","буря":"⛈️","туман":"🌫️",
  "привіт":"👋","до побачення":"👋","будь ласка":"🙏","дякую":"🙏","так":"✅","ні":"❌","вибач":"🙏","мене звати":"🪪",
  "я":"🙋","ти":"👉","він":"👨","вона":"👩","воно":"🧒","ми":"👥","вони":"👪",
  "один":"1️⃣","два":"2️⃣","три":"3️⃣","чотири":"4️⃣","п'ять":"5️⃣","шість":"6️⃣","сім":"7️⃣","вісім":"8️⃣","дев'ять":"9️⃣","десять":"🔟",
  "одинадцять":"🔢","дванадцять":"🔢","тринадцять":"🔢","п'ятнадцять":"🔢","двадцять":"🔢","тридцять":"🔢","сорок":"🔢","п'ятдесят":"🔢","вісімдесят":"🔢","сто":"💯",
  "це":"👉","те":"👉","тут":"📍","там":"📍","добре":"👍","погано":"👎","добрий":"😇","поганий":"👎","великий":"🔺","малий":"🔹",
  "хотіти":"🙏","мати":"🤲","йти":"🚶","подобатись":"❤️","потребувати":"🆘","могти":"💪","бачити":"👀","знати":"🧠","бути":"🔗",
  "мама":"👩","тато":"👨","сестра":"👧","брат":"👦","син":"👦","дочка":"👧","родина":"👪","батьки":"👫",
  "червоний":"🔴","синій":"🔵","зелений":"🟢","жовтий":"🟡","чорний":"⚫","білий":"⚪","помаранчевий":"🟠","рожевий":"🩷",
  "понеділок":"📅","вівторок":"📅","середа":"📅","четвер":"📅","п'ятниця":"📅","субота":"📅","неділя":"📅","сьогодні":"📆","завтра":"📆",
  "весна":"🌸","літо":"☀️","осінь":"🍂","зима":"❄️","січень":"📅","липень":"📅","місяць":"🗓️","рік":"🗓️","тиждень":"📅","пора року":"🍁",
  "вода":"💧","хліб":"🍞","кава":"☕","чай":"🍵","яблуко":"🍎","молоко":"🥛","м'ясо":"🥩","яйце":"🥚",
  "рука":"✋","око":"👁️","вухо":"👂","ніс":"👃","рот":"👄","нога":"🦵","волосся":"💇","серце":"❤️","обличчя":"😊",
  "сорочка":"👕","штани":"👖","взуття":"👟","сукня":"👗","куртка":"🧥","капелюх":"🎩","шкарпетки":"🧦","пальто":"🧥",
  "меню":"📋","рахунок":"🧾","замовлення":"📝","столик":"🍽️","офіціант":"🧑‍🍳","смачно":"😋","скільки":"💰",
  "година":"🕐","хвилина":"⏱️","зараз":"⏰","рано":"🌅","пізно":"🌙","ранок":"🌅","вечір":"🌆",
  "сонце":"☀️","дощ":"🌧️","сніг":"❄️","вітер":"💨","спекотно":"🥵","холодно":"🥶","хмара":"☁️","тепло":"🌤️","спека":"🥵","холод":"🥶","погода":"🌦️",
  "будинок":"🏠","кімната":"🚪","кухня":"🍳","двері":"🚪","вікно":"🪟","ліжко":"🛏️","стілець":"🪑","підлога":"🔲",
  "місто":"🏙️","вулиця":"🛣️","магазин":"🏪","гроші":"💰","автобус":"🚌","станція":"🚉","ліворуч":"⬅️","праворуч":"➡️","близько":"📍",
  "авто":"🚗","потяг":"🚆","літак":"✈️","велосипед":"🚲","таксі":"🚕","корабель":"🚢","дорога":"🛣️","керувати":"🚗",
  "крамниця":"🏪","ціна":"🏷️","дешевий":"💸","дорогий":"💰","купувати":"🛒","платити":"💳","розмір":"📏","картка":"💳","готівка":"💵",
  "високий":"📏","низький":"📏","легкий":"🟢","важкий":"🔴","швидкий":"⚡","повільний":"🐢","гарний":"✨","сильний":"💪",
  "аеропорт":"🛫","квиток":"🎫","багаж":"🧳","паспорт":"🛂","готель":"🏨","рейс":"✈️","забронювати":"📅","прибуття":"🛬","вихід":"🚪","затримка":"⏳","валіза":"🧳",
  "робота":"💼","офіс":"🏢","зустріч":"🤝","начальник":"👔","зарплата":"💵","колега":"🧑‍💼","дедлайн":"⏰","працювати":"💼","імейл":"📧","проєкт":"📊","фірма":"🏢",
  "лікар":"🩺","біль":"🤕","ліки":"💊","хворий":"🤒","голова":"🤯","боліти":"🤕","здоровий":"💪","лікарня":"🏥","застуда":"🤧","втомлений":"😴",
  "щасливий":"😊","сумний":"😢","злий":"😠","наляканий":"😨","розумний":"🧠","смішний":"😂","знуджений":"😑",
  "дерево":"🌳","річка":"🏞️","гора":"⛰️","море":"🌊","небо":"☁️","квітка":"🌸","ліс":"🌲","тварина":"🐾",
  "собака":"🐶","кіт":"🐱","пташка":"🐦","риба":"🐟","кінь":"🐴","корова":"🐮","ведмідь":"🐻","вовк":"🐺",
  "музика":"🎵","спорт":"⚽","гра":"🎮","книга":"📖","фільм":"🎬","танцювати":"💃","співати":"🎤","подорожувати":"🧳",
  "страва":"🍽️","закуска":"🥗","десерт":"🍰","виделка":"🍴","ніж":"🔪","ложка":"🥄","тарілка":"🍽️","склянка":"🥛","келих":"🍷","серветка":"🧻",
  "школа":"🏫","вчитель":"👩‍🏫","учень":"🧑‍🎓","зошит":"📓","урок":"📚","іспит":"📝","вчити":"📖","писати":"✍️","читати":"📖",
  "довкілля":"🌍","природа":"🌿","забруднення":"🏭","клімат":"🌡️","енергія":"⚡","планета":"🌍","переробляти":"♻️","захищати":"🛡️",
  "новини":"📰","газета":"📰","стаття":"📄","журналіст":"🎤","телебачення":"📺","радіо":"📻","повідомляти":"📢","історія":"📖",
  "наука":"🔬","число":"🔢","результат":"📊","питання":"❓","відповідь":"💬","ідея":"💡","проблема":"⚠️","приклад":"📎",
  "вгору":"⬆️","вниз":"⬇️","повертати":"↩️","зупинятись":"🛑","далеко":"🗺️","прямо":"⬆️","ріг":"📐","карта":"🗺️",
  "банк":"🏦","банкомат":"🏧","лист":"✉️","марка":"📮","черга":"🧍","підпис":"✍️","допомога":"🆘","надсилати":"📤",
  "їсти":"🍽️","пити":"🥤","спати":"😴","жити":"🏠","говорити":"🗣️","гратися":"🎮","відчиняти":"🚪","зачиняти":"🚪",
  "думка":"💭","однак":"🔄","причина":"❓","я думаю":"💭",
  "компанія":"🏢","клієнт":"🧑","прибуток":"📈","ринок":"🏪","інвестувати":"💰","контракт":"📄","зростання":"📈","стратегія":"♟️",
  "уряд":"🏛️","закон":"⚖️","свобода":"🕊️","суспільство":"👥","права":"✊","вибори":"🗳️","зміна":"🔄","майбутнє":"🔮","країна":"🌍",
  "комп'ютер":"💻","телефон":"📱","інтернет":"🌐","екран":"🖥️","пароль":"🔒","застосунок":"📲","онлайн":"🌐","файл":"📁","дані":"📊","повідомлення":"💬",
  "футбол":"⚽","м'яч":"⚽","команда":"👥","гравець":"🏃","гол":"🥅","бігати":"🏃","вигравати":"🏆","плавати":"🏊",
  "пісня":"🎶","мистецтво":"🎨","картина":"🖼️","митець":"🧑‍🎨","концерт":"🎫","сцена":"🎭","живопис":"🖌️",
  "парк":"🌳","стіна":"🧱","ванна":"🛁","йти пішки":"🚶","перепрошую":"🙏","нема за що":"🙏",
  "бабуся":"👵","дідусь":"👴","вихідні":"🎉","день":"📆","березень":"📅","грудень":"📅","коштувати":"💰","знижка":"🏷️","температура":"🌡️","медсестра":"👩‍⚕️",
  "професія":"💼","інженер":"👷","водій":"🚗","кухар":"👨‍🍳","фермер":"👨‍🌾","продавець":"🛍️","письменник":"✍️","поліцейський":"👮","музикант":"🎸","актор":"🎭",
  "банан":"🍌","помідор":"🍅","картопля":"🥔","морква":"🥕","цибуля":"🧅","виноград":"🍇","лимон":"🍋","огірок":"🥒","полуниця":"🍓","груша":"🍐",
};
function emojiFor(ua){ const k = String(ua||'').toLowerCase().split(/[,(/…]/)[0].trim(); return EMOJI[k] || ''; }

/* частина мови за уроком (домінантна) */
const POS_BY_ID = {
  1:'займенник',2:'займенник',3:'числівник',4:'числівник',5:'вираз',6:'займенник',
  7:'дієслово',8:'дієслово',9:'іменник',10:'прикметник',11:'іменник',12:'іменник',13:'іменник',14:'іменник',15:'іменник',
  16:'іменник',17:'іменник',18:'іменник',19:'іменник',20:'іменник',21:'іменник',22:'іменник',23:'прикметник',24:'прийменник',
  25:'іменник',26:'іменник',27:'іменник',28:'дієслово',29:'прикметник',30:'дієслово',31:'іменник',
  32:'вираз',33:'іменник',34:'іменник',35:'вираз',36:'іменник',
  37:'іменник',38:'іменник',39:'іменник',40:'іменник',41:'іменник',42:'іменник',43:'дієслово',44:'прислівник',45:'іменник',46:'іменник',
  47:'дієслово',48:'дієслово',49:'іменник',50:'іменник',51:'іменник',52:'іменник',53:'іменник',54:'іменник',55:'іменник',56:'іменник',
};
/* точна частина мови за українським перекладом (перекриває POS_BY_ID) */
const POS_UA = {
  'хто':'займенник','що':'займенник','котрий':'займенник',
  'я':'займенник','ти':'займенник','він':'займенник','вона':'займенник','воно':'займенник','ми':'займенник','ви':'займенник','вони':'займенник',
  'це':'займенник','те':'займенник',
  'коли':'прислівник','де':'прислівник','чому':'прислівник','як':'прислівник',
  'тут':'прислівник','там':'прислівник','зараз':'прислівник','рано':'прислівник','пізно':'прислівник',
  'ліворуч':'прислівник','праворуч':'прислівник','близько':'прислівник','далеко':'прислівник','прямо':'прислівник',
  'вгору':'прислівник','вниз':'прислівник','сьогодні':'прислівник','завтра':'прислівник','скільки':'прислівник',
  'скоро':'прислівник','пізніше':'прислівник','потім':'прислівник','мабуть':'прислівник','можливо':'прислівник','вчора':'прислівник','тому':'прислівник',
  'один':'числівник','два':'числівник','три':'числівник','чотири':'числівник',"п'ять":'числівник','шість':'числівник','сім':'числівник','вісім':'числівник',"дев'ять":'числівник','десять':'числівник','одинадцять':'числівник','дванадцять':'числівник','тринадцять':'числівник',"п'ятнадцять":'числівник','двадцять':'числівник','тридцять':'числівник','сорок':'числівник',"п'ятдесят":'числівник','вісімдесят':'числівник','сто':'числівник',
  'в':'прийменник','на':'прийменник','під':'прийменник','позаду':'прийменник','поруч з':'прийменник','між':'прийменник','над':'прийменник','всередині':'прийменник',
  'однак':'сполучник','тому що':'сполучник','хоча':'сполучник',
  'так':'частка','ні':'частка',
  'бути':'дієслово','хотіти':'дієслово','мати':'дієслово','йти':'дієслово','подобатись':'дієслово','потребувати':'дієслово','могти':'дієслово','бачити':'дієслово','знати':'дієслово',
  'їсти':'дієслово','пити':'дієслово','спати':'дієслово','жити':'дієслово','говорити':'дієслово','гратися':'дієслово','відчиняти':'дієслово','зачиняти':'дієслово',
  'керувати':'дієслово','купувати':'дієслово','платити':'дієслово','забронювати':'дієслово','працювати':'дієслово','боліти':'дієслово','надсилати':'дієслово','повідомляти':'дієслово','переробляти':'дієслово','захищати':'дієслово','танцювати':'дієслово','співати':'дієслово','подорожувати':'дієслово','вчити':'дієслово','писати':'дієслово','читати':'дієслово','повертати':'дієслово','зупинятись':'дієслово','погоджуватись':'дієслово','інвестувати':'дієслово','усвідомити':'дієслово','стати':'дієслово','буде':'дієслово','збиратися':'дієслово','сподіватися':'дієслово','здаватись':'дієслово','шукати':'дієслово','дізнатись':'дієслово',
  'готувати':'дієслово','смажити':'дієслово','варити':'дієслово','святкувати':'дієслово','запрошувати':'дієслово','бажати':'дієслово',
  'зустрічати':'дієслово','довіряти':'дієслово','ділитися':'дієслово',
  'бігати':'дієслово','вигравати':'дієслово','плавати':'дієслово','йти пішки':'дієслово','перепрошую':'вираз',
  'коштувати':'дієслово','день':'іменник','вихідні':'іменник',
  'голодний':'прикметник','спраглий':'прикметник','солодкий':'прикметник','іноземний':'прикметник','рідний':'прикметник','близький':'прикметник',
  'разом':'прислівник','сам':'прислівник',
  'червоний':'прикметник','синій':'прикметник','зелений':'прикметник','жовтий':'прикметник','чорний':'прикметник','білий':'прикметник','помаранчевий':'прикметник','рожевий':'прикметник',
  'добре':'прикметник','погано':'прикметник','добрий':'прикметник','поганий':'прикметник','великий':'прикметник','малий':'прикметник',
  'високий':'прикметник','низький':'прикметник','легкий':'прикметник','важкий':'прикметник','швидкий':'прикметник','повільний':'прикметник','гарний':'прикметник','сильний':'прикметник',
  'щасливий':'прикметник','сумний':'прикметник','злий':'прикметник','наляканий':'прикметник','розумний':'прикметник','смішний':'прикметник','знуджений':'прикметник',
  'дешевий':'прикметник','дорогий':'прикметник','здоровий':'прикметник','хворий':'прикметник','втомлений':'прикметник',
  'спекотно':'прикметник','холодно':'прикметник','тепло':'прикметник','смачно':'прикметник','наступний':'прикметник','минулий':'прикметник',
  'план':'іменник','ріг':'іменник','карта':'іменник','думка':'іменник','причина':'іменник','майбутнє':'іменник',
  'привіт':'вираз','до побачення':'вираз','будь ласка':'вираз','дякую':'вираз','вибач':'вираз','мене звати':'вираз',
  'я б хотів':'вираз','котра година':'вираз','я думаю':'вираз','звісно':'вираз','нема за що':'вираз','до речі':'вираз','неважливо':'вираз','мати рацію':'вираз','гаразд':'вираз','потроху':'вираз','бережи себе':'вираз','мати сенс':'вираз',
};
function posOf(card, lesson){
  const base = String((card&&card.ua)||'').toLowerCase().split(/[,(/…]/)[0].trim();
  return POS_UA[base] || POS_BY_ID[lesson.id] || 'слово';
}

/* службові слова, які вважаємо «безкоштовними» для допуску речень */
const GLUE = new Set(['a','an','the','my','your','his','her','our','their','and','or','to']);
function wordsOf(str){ return String(str||'').split(/\s+/).map(w=>w.replace(/[¿¡?!.,;:()"«»]/g,'').toLowerCase()).filter(Boolean); }
function lessonVocab(l){
  const s=new Set();
  (l.cards||[]).forEach(c=> wordsOf(c.en).forEach(w=>s.add(w)));
  (l.verbs||[]).forEach(v=>{ wordsOf(v.inf).forEach(w=>s.add(w)); (v.tenses?v.tenses.reduce((a,t)=>a.concat(t.rows),[]):(v.forms||[])).forEach(f=> wordsOf(f.f).forEach(w=>s.add(w))); });
  return s;
}
/* фонд речень, доступних станом на цей урок (лише знайомі слова) */
function sentencePool(lesson){
  const idx = LESSONS.indexOf(lesson);
  const vocab = new Set();
  for(let k=0;k<=idx;k++) lessonVocab(LESSONS[k]).forEach(w=>vocab.add(w));
  const known = w => !w || vocab.has(w) || GLUE.has(w) || /^[0-9]+$/.test(w);
  const seen = new Set(), items = [];
  for(let k=0;k<=idx;k++) (LESSONS[k].sentences||[]).forEach(sn=>{
    if(!seen.has(sn.en) && wordsOf(sn.en).every(known)){ seen.add(sn.en); items.push(sn); }
  });
  return items;
}
/* урок «готовий» лише коли всі розділи пройдені: слова 100% + тест 100% + речення */
function lessonDone(l){
  const set = progress[l.id] || {};
  const wordsDone = l.cards.length>0 && knownCount(l)===l.cards.length;
  const quizDone = !!set['@quiz'];
  const sentDone = !!set['@sent'] || sentencePool(l).length===0;
  return wordsDone && quizDone && sentDone;
}

/* ---------- екран: рівні й уроки ---------- */
function renderHome(){
  const known = totalKnown(), total = totalCards();
  const pct = total ? Math.round(known/total*100) : 0;
  let currentId = null;
  for(const l of LESSONS){ if(!lessonDone(l)){ currentId = l.id; break; } }
  const orderNum = {}; { let _n=0; LEVELS.forEach(lv=> LESSONS.filter(l=>l.level===lv.id).forEach(l=>{ orderNum[l.id]=++_n; })); }
  let view = 'map'; try{ if(localStorage.getItem('deutsch.homeview')==='list') view='list'; }catch(e){}

  const installBanner = isStandalone() ? '' : `<div class="review-banner install" id="installBanner">
      <div class="rb-ico">⬇️</div>
      <div class="rb-meta"><div class="rb-title">Встановити застосунок</div><small>відкривати як окремий застосунок, не вкладку</small></div>
      <div class="rb-badge">＋</div></div>`;
  const reviewBanner = (function(){
    const due = reviewDue().length, tot = reviewCount();
    if(!tot) return '';
    return `<div class="review-banner" id="reviewBanner">
      <div class="rb-ico">🔁</div>
      <div class="rb-meta"><div class="rb-title">Повторення</div>
        <small>${due ? due+' слів чекають' : 'на повторенні '+tot+' слів'}</small></div>
      <div class="rb-badge">${due || '✓'}</div></div>`;
  })();
  const vocabBanner = `<div class="review-banner" id="vocabBanner">
      <div class="rb-ico">📖</div>
      <div class="rb-meta"><div class="rb-title">Словник</div><small>пошук будь-якого слова + вивчені</small></div>
      <div class="rb-badge">${totalKnown()}</div></div>`;
  const dictBanner = `<div class="review-banner" id="dictBanner">
      <div class="rb-ico">🎧</div>
      <div class="rb-meta"><div class="rb-title">Аудіо-диктант</div><small>почуй слово — обери переклад</small></div>
      <div class="rb-badge">▶</div></div>`;
  const adBanner = isPremium() ? '' : `<div class="review-banner" id="premiumBanner">
      <div class="rb-ico">⭐</div>
      <div class="rb-meta"><div class="rb-title">Преміум</div><small>підтримати проєкт і навчатись без обмежень</small></div>
      <div class="rb-badge">→</div></div>`;

  const offsets = [0,36,52,36,0,-36,-52,-36]; let gi = 0;
  const mapHtml = `<div class="road">` + LEVELS.map(lv=>{
    const ls = LESSONS.filter(l=>l.level===lv.id);
    if(!ls.length) return '';
    const lk = ls.reduce((s,l)=>s+knownCount(l),0), lt = ls.reduce((s,l)=>s+l.cards.length,0);
    return `<div class="road-milestone">
        <span class="level-badge">${lv.id}</span>
        <div class="level-meta"><div class="level-name">${esc(lv.name)}</div><small>${esc(lv.hint)}</small></div>
        <span class="level-count">${lk}/${lt}</span>
      </div>` + ls.map(l=>{
        const k = knownCount(l), done = lessonDone(l);
        const state = done ? 'done' : (l.id===currentId ? 'current' : (k>0 ? 'started' : 'todo'));
        const off = offsets[gi++ % offsets.length];
        const badge = done ? '<span class="rn-badge">✓</span>' : (l.id===currentId ? '<span class="rn-badge star">★</span>' : '');
        return `<div class="road-node-wrap" style="transform:translateX(${off}px)">
          <button class="road-node ${state}" data-id="${l.id}"><span class="rn-emoji">${l.icon}</span>${badge}</button>
          <div class="road-label"><b>${orderNum[l.id]}.</b> ${esc(l.title)}</div>
        </div>`;
      }).join('');
  }).join('') + `</div>`;

  const listHtml = LEVELS.map(lv=>{
    const ls = LESSONS.filter(l=>l.level===lv.id);
    if(!ls.length) return '';
    const lk = ls.reduce((s,l)=>s+knownCount(l),0), lt = ls.reduce((s,l)=>s+l.cards.length,0);
    return `
      <div class="level">
        <div class="level-head">
          <span class="level-badge">${lv.id}</span>
          <div class="level-meta"><div class="level-name">${esc(lv.name)}</div><small>${esc(lv.hint)}</small></div>
          <span class="level-count">${lk}/${lt}</span>
        </div>
        <div class="lessons">
          ${ls.map(l=>{
            const k = knownCount(l), done = lessonDone(l);
            return `<div class="lesson-card" data-id="${l.id}">
              <div class="emoji">${l.icon}</div>
              <div class="meta"><h3>${orderNum[l.id]}. ${esc(l.title)}</h3>
                <small>${esc(l.subtitle)} · ${l.cards.length} слів</small></div>
              <div class="ring ${done?'badge-done':''}">${done?'✓':k+'/'+l.cards.length}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="topbar">
      <div class="brand"><span class="logo">D</span> Deutsch <b>·</b> німецька</div>
      <div class="spacer"></div>
      <button class="iconbtn" id="theme" title="Тема">${themeIcon()}</button>
      <button class="iconbtn" id="reset" title="Скинути прогрес">↺</button>
    </div>
    <div class="hero">
      <h1>Англійська з нуля 👋</h1>
      <p>Твій маршрут навчання — крок за кроком.</p>
      <div class="progress">
        <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
        <div class="lbl">Пройдено ${known} із ${total} слів · ${pct}% курсу</div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-num">🔥 ${displayStreak()}</div><div class="stat-lbl">днів поспіль</div></div>
        <button class="stat goal" id="goalTile"><div class="stat-num">🎯 ${Math.min(todayCount(),streakData.goal)}/${streakData.goal}${todayCount()>=streakData.goal?' ✓':''}</div><div class="stat-lbl">ціль сьогодні</div></button>
      </div>
      ${currentId ? `<button class="continue-btn" id="continueBtn">▶ Продовжити навчання</button>` : `<div class="continue-done">🎉 Курс пройдено! Повторюй слова, щоб не забути.</div>`}
    </div>
    ${installBanner}
    ${reviewBanner}
    ${vocabBanner}
    ${dictBanner}
    <div class="viewtoggle">
      <button data-v="map" class="${view==='map'?'active':''}">🗺️ Мапа</button>
      <button data-v="list" class="${view==='list'?'active':''}">☰ Список</button>
    </div>
    ${view==='map' ? mapHtml : listHtml}
    ${adBanner}
    <p class="hint">Встанови як застосунок: меню браузера → «Додати на головний екран».</p>
  `;
  root.querySelectorAll('.road-node, .lesson-card').forEach(el=>{ el.onclick = ()=>{ location.hash = '#/lesson/'+el.dataset.id; }; });
  const rb = root.querySelector('#reviewBanner'); if(rb) rb.onclick = ()=>{ location.hash = '#/review'; };
  const vb = root.querySelector('#vocabBanner'); if(vb) vb.onclick = ()=>{ location.hash = '#/vocab'; };
  const dbn = root.querySelector('#dictBanner'); if(dbn) dbn.onclick = ()=>{ location.hash = '#/dictation'; };
  const ib = root.querySelector('#installBanner'); if(ib) ib.onclick = doInstall;
  const cbtn = root.querySelector('#continueBtn'); if(cbtn) cbtn.onclick = ()=>{ location.hash = '#/lesson/'+currentId; };
  const ad = root.querySelector('#premiumBanner'); if(ad) ad.onclick = ()=>{ location.hash = '#/premium'; };
  root.querySelectorAll('.viewtoggle button').forEach(b=>{ b.onclick=()=>{ try{ localStorage.setItem('deutsch.homeview', b.dataset.v); }catch(e){} renderHome(); }; });
  const gtile = root.querySelector('#goalTile'); if(gtile) gtile.onclick = ()=>{ cycleGoal(); renderHome(); };
  const th = root.querySelector('#theme'); if(th) th.onclick = ()=>{ cycleTheme(); renderHome(); };
  root.querySelector('#reset').onclick = ()=>{ if(confirm('Скинути весь прогрес?')){ progress={}; saveProgress(progress); review={}; saveReview(review); renderHome(); } };
}

/* ---------- екран: повторення ---------- */
function renderReview(){
  const due = shuffle(reviewDue());
  const total = reviewCount();
  function frame(inner){
    root.innerHTML = `
      <div class="topbar">
        <button class="backbtn" id="back">← Головна</button>
        <div class="spacer"></div>
        <div class="brand" style="font-size:14px">🔁 Повторення</div>
        <div class="spacer"></div>
        <button class="iconbtn" id="speed">${RATES[rateIdx()].e}</button>
      </div>
      <div id="content">${inner}</div>`;
    root.querySelector('#back').onclick=()=>{ location.hash='#/'; };
    root.querySelector('#speed').onclick=()=>{ setRateIdx((rateIdx()+1)%RATES.length); root.querySelector('#speed').textContent=RATES[rateIdx()].e; };
  }
  if(!total){
    frame(`<div class="done-card"><div class="score">🗂️</div>
      <p>Складних слів ще немає. Помились у тесті або познач «↻ Повторити» у картках — і слова зʼявляться тут для інтервального повторення.</p>
      <button class="primary" id="go">До уроків</button></div>`);
    root.querySelector('#go').onclick=()=>location.hash='#/'; return;
  }
  if(!due.length){
    frame(`<div class="done-card"><div class="score">✅</div>
      <p>Все повторено! Наступна порція зʼявиться пізніше.<br>Усього слів на повторенні: ${total}.</p>
      <button class="primary" id="go">До уроків</button></div>`);
    root.querySelector('#go').onclick=()=>location.hash='#/'; return;
  }
  let i=0;
  function draw(){
    if(i>=due.length){ done(); return; }
    const it=due[i];
    frame(`
      <div class="counter">${i+1} / ${due.length}</div>
      <div class="stage">
        <div class="card word">
          <div class="tag">ПОВТОРЕННЯ</div>
          <div class="ua">${esc(it.ua)}</div>
          <div id="reveal" hidden>
            <div class="en">${esc(it.en)}</div>
            <div class="tr">${trHTML(it.tr)}</div>
            <button class="speak speak-ico" id="say" title="Послухати">🔊</button>
          </div>
        </div>
        <div id="ctrls">
          <button class="btn-know" id="show" style="width:100%;border-radius:16px;padding:15px;border:none;font-size:15px;font-weight:700;box-shadow:var(--shadow);color:#fff">Показати відповідь</button>
        </div>
      </div>`);
    root.querySelector('#show').onclick=()=>{
      root.querySelector('#reveal').hidden=false;
      speak(it.en);
      root.querySelector('#say').onclick=()=>speak(it.en);
      root.querySelector('#ctrls').innerHTML=`
        <div class="controls">
          <button class="btn-again" id="no">Ще ні</button>
          <button class="btn-know" id="yes">Знаю ✓</button>
        </div>`;
      root.querySelector('#no').onclick=()=>{ gradeReview(rvKey(it.l,it.en),false); i++; draw(); };
      root.querySelector('#yes').onclick=()=>{ gradeReview(rvKey(it.l,it.en),true); bumpDaily(); i++; draw(); };
    };
  }
  function done(){
    frame(`<div class="done-card"><div class="score">🎉</div>
      <p>Повторення завершено!<br>Залишилось на потім: ${reviewCount()} слів.</p>
      <button class="primary" id="go">До уроків</button></div>`);
    root.querySelector('#go').onclick=()=>location.hash='#/';
  }
  draw();
}

/* ---------- екран: підписка (без реклами) ---------- */
function renderPremium(){
  const prem = isPremium();
  const nativeMode = !!(window.Native && Native.isNative);
  const subPrice = (nativeMode && Native.price()) || '₴59 / міс';
  root.innerHTML = `
    <div class="topbar">
      <button class="backbtn" id="back">← Головна</button>
      <div class="spacer"></div>
      <div class="brand" style="font-size:14px">⭐ Преміум</div>
      <div class="spacer"></div>
    </div>
    <div class="hero">
      <h1>Преміум ⭐</h1>
      <p>${prem?'Преміум активовано. Дякуємо за підтримку! 💛':'Підтримай проєкт і відкрий повний доступ.'}</p>
    </div>
    <div class="paywall">
      <div class="pw-benefit">♾️ Повний доступ до всіх функцій</div>
      <div class="pw-benefit">🔁 Повторення без обмежень</div>
      <div class="pw-benefit">🎧 Пріоритет якісного голосу</div>
      <div class="pw-benefit">❤️ Підтримка розвитку курсу</div>
      ${prem
          ? (nativeMode
              ? `<p class="hint">Підписку активовано. Керувати чи скасувати — у Google Play → Підписки.</p>`
              : `<button class="primary" id="cancel" style="background:#fff;color:var(--pink)">Вимкнути преміум (демо)</button>`)
          : (nativeMode
              ? `<button class="pw-plan best" id="subBtn"><b>Преміум ⭐</b><span>${esc(subPrice)}</span></button>
                 <button class="pw-restore" id="restore">Відновити покупку</button>`
              : `<div class="pw-plans">
                   <button class="pw-plan" data-p="month"><b>Місяць</b><span>₴59 / міс</span></button>
                   <button class="pw-plan best" data-p="year"><b>Рік ⭐</b><span>₴399 / рік · вигідно</span></button>
                 </div>`)}
      <p class="hint">${nativeMode
          ? 'Оплата — через Google Play. Скасувати підписку можна будь-коли.'
          : 'Демо: підписка вмикається локально на цьому пристрої. У версії Google Play тут працюватиме справжня оплата (Google Play Billing).'}</p>
    </div>`;
  root.querySelector('#back').onclick=()=>location.hash='#/';
  if(nativeMode){
    const sb=root.querySelector('#subBtn');
    if(sb) sb.onclick=async()=>{ sb.disabled=true; const ok=await Native.buy(); if(!ok) sb.disabled=false; /* успіх обробить entitlement-колбек */ };
    const rs=root.querySelector('#restore'); if(rs) rs.onclick=()=>Native.restore();
  } else {
    root.querySelectorAll('.pw-plan').forEach(b=> b.onclick=()=>{ setPremium(true); alert('Готово! Преміум активовано ⭐\n(демо — у версії Google Play тут буде справжня оплата підписки).'); location.hash='#/'; });
  }
  const c = root.querySelector('#cancel'); if(c) c.onclick=()=>{ setPremium(false); renderPremium(); };
}

/* ---------- екран: словник ---------- */
function renderVocab(mode){
  mode = (mode==='learned') ? 'learned' : 'all';
  function collect(onlyLearned){
    const out=[]; const seen=new Set();
    LESSONS.forEach(l=>{ const set = progress[l.id]||{}; l.cards.forEach(c=>{
      if(onlyLearned && !set[c.en]) return;
      if(seen.has(c.en)) return; seen.add(c.en);
      out.push({ en:c.en, ua:c.ua, tr:c.tr, level:l.level, pos:posOf(c,l), emoji:emojiFor(c.ua) });
    }); });
    return out;
  }
  const learned = collect(true);
  const all = collect(false).sort((a,b)=> a.en.localeCompare(b.en));
  const words = mode==='learned' ? learned : all;
  const levels = ['','A0','A1','A2','B1','B2'];
  const posOrder = ['іменник','дієслово','прикметник','займенник','числівник','прислівник','прийменник','сполучник','частка','вираз'];
  const present = new Set(words.map(w=>w.pos));
  const posList = [''].concat(posOrder.filter(p=>present.has(p)));
  let fLevel = '', fPos = '', fQ = '';
  root.innerHTML = `
    <div class="topbar">
      <button class="backbtn" id="back">← Головна</button>
      <div class="spacer"></div>
      <div class="brand" style="font-size:14px">📖 Словник</div>
      <div class="spacer"></div>
      <button class="iconbtn" id="speed">${RATES[rateIdx()].e}</button>
    </div>
    <div class="subtabs" id="vmode">
      <button data-m="all" class="${mode==='all'?'active':''}">📚 Усі слова</button>
      <button data-m="learned" class="${mode==='learned'?'active':''}">📗 Вивчені</button>
    </div>
    <div class="hero" style="padding:12px 16px"><div class="lbl" id="vcount"></div></div>
    <div class="vsearch"><input id="vq" type="search" placeholder="🔍 Пошук слова…" autocomplete="off" autocapitalize="none"></div>
    <div class="vfilters">
      <div class="vrow" id="flevels">${levels.map(lv=>`<button data-l="${lv}" class="vchip ${lv===''?'active':''}">${lv||'Усі рівні'}</button>`).join('')}</div>
      <div class="vrow" id="fpos">${posList.map(p=>`<button data-p="${p}" class="vchip ${p===''?'active':''}">${p||'Усі частини'}</button>`).join('')}</div>
    </div>
    <div id="vocablist"></div>`;
  root.querySelector('#back').onclick=()=>location.hash='#/';
  root.querySelector('#speed').onclick=()=>{ setRateIdx((rateIdx()+1)%RATES.length); root.querySelector('#speed').textContent=RATES[rateIdx()].e; };
  root.querySelectorAll('#vmode button').forEach(b=> b.onclick=()=>renderVocab(b.dataset.m));
  function render(){
    const list = words.filter(w=> (!fLevel||w.level===fLevel) && (!fPos||w.pos===fPos) && (!fQ || w.en.toLowerCase().includes(fQ) || w.ua.toLowerCase().includes(fQ)));
    const base = mode==='learned' ? `Вивчено слів: ${words.length}` : `Усього слів: ${words.length}`;
    root.querySelector('#vcount').textContent = base + ((fLevel||fPos||fQ)?` · показано: ${list.length}`:'');
    const el = root.querySelector('#vocablist');
    if(!words.length){ el.innerHTML=`<div class="done-card"><div class="score">📖</div><p>Ще нема вивчених слів. Познач слова «✓ Знаю» у розділі Слова — або перемкни на «📚 Усі слова».</p></div>`; return; }
    if(!list.length){ el.innerHTML=`<div class="done-card"><p>За цим запитом слів нема.</p></div>`; return; }
    el.innerHTML = list.map((w,i)=>`<button class="vrowitem" data-en="${esc(w.en)}">
      <span class="vnum">${i+1}</span>
      <span class="vemoji">${w.emoji||'•'}</span>
      <span class="vmain"><span class="ven">${esc(w.en)}</span><span class="vua">${esc(w.ua)} · ${trHTML(w.tr)}</span></span>
      <span class="vlvl">${w.level}</span>
      <span class="vpos">${esc(w.pos)}</span>
    </button>`).join('');
    el.querySelectorAll('.vrowitem').forEach(b=> b.onclick=()=>speak(b.dataset.en));
  }
  root.querySelectorAll('#flevels .vchip').forEach(b=> b.onclick=()=>{ fLevel=b.dataset.l; root.querySelectorAll('#flevels .vchip').forEach(x=>x.classList.toggle('active',x===b)); render(); });
  root.querySelectorAll('#fpos .vchip').forEach(b=> b.onclick=()=>{ fPos=b.dataset.p; root.querySelectorAll('#fpos .vchip').forEach(x=>x.classList.toggle('active',x===b)); render(); });
  const vq=root.querySelector('#vq'); if(vq) vq.oninput=()=>{ fQ=vq.value.trim().toLowerCase(); render(); };
  render();
}

/* ---------- екран: аудіо-диктант ---------- */
function renderDictation(){
  const all = []; LESSONS.forEach(l=> l.cards.forEach(c=> all.push({en:c.en, ua:c.ua, tr:c.tr, l:l.id})));
  const learned = all.filter(c=> (progress[c.l]||{})[c.en]);
  const pool = learned.length>=4 ? learned : all;
  const qs = shuffle(pool).slice(0, Math.min(10, pool.length)).map(card=>{
    const others = shuffle(all.filter(c=> c.ua!==card.ua)).slice(0,3);
    return { card, opts: shuffle([card, ...others]) };
  });
  let i=0, score=0;
  function frame(inner){
    root.innerHTML = `
      <div class="topbar">
        <button class="backbtn" id="back">← Головна</button>
        <div class="spacer"></div>
        <div class="brand" style="font-size:14px">🎧 Аудіо-диктант</div>
        <div class="spacer"></div>
        <button class="iconbtn" id="speed">${RATES[rateIdx()].e}</button>
      </div>
      <div id="content">${inner}</div>`;
    root.querySelector('#back').onclick=()=>location.hash='#/';
    root.querySelector('#speed').onclick=()=>{ setRateIdx((rateIdx()+1)%RATES.length); root.querySelector('#speed').textContent=RATES[rateIdx()].e; };
  }
  if(!pool.length){
    frame(`<div class="done-card"><div class="score">🎧</div><p>Ще нема слів для диктанту. Повчи слова в уроках — і повертайся.</p><button class="primary" id="go">До уроків</button></div>`);
    root.querySelector('#go').onclick=()=>location.hash='#/'; return;
  }
  function draw(){
    if(i>=qs.length){ finish(); return; }
    const {card, opts}=qs[i];
    frame(`
      <div class="counter">Питання ${i+1} / ${qs.length}</div>
      <div class="quiz-q">
        <div class="prompt">Послухай і обери переклад:</div>
        <button class="dict-play" id="play">🔊 Прослухати ще раз</button>
      </div>
      <div class="options">
        ${opts.map((o,k)=>`<button data-k="${k}">${esc(o.ua)}</button>`).join('')}
      </div>`);
    root.querySelector('#play').onclick=()=>speak(card.en);
    speak(card.en);
    const btns=root.querySelectorAll('.options button');
    btns.forEach(b=>{ b.onclick=()=>{
      const chosen=opts[b.dataset.k], ok=chosen.ua===card.ua;
      if(ok) score++;
      btns.forEach(x=>{ x.disabled=true; const o=opts[x.dataset.k];
        if(o.ua===card.ua) x.classList.add('correct'); else if(x===b) x.classList.add('wrong'); });
      if(ok) bumpDaily(); else addReview(card.l, {en:card.en, ua:card.ua, tr:card.tr});
      setTimeout(()=>{ i++; draw(); }, 950);
    }; });
  }
  function finish(){
    const pct=Math.round(score/qs.length*100);
    const msg = pct===100?'Ідеальний слух! 🎉' : pct>=70?'Гарно чуєш! 💪' : 'Слухай більше — вийде 🔁';
    frame(`<div class="done-card"><div class="score">${score}/${qs.length}</div><p>${msg}</p><button class="primary" id="retry">Ще раз</button></div>`);
    root.querySelector('#retry').onclick=()=>renderDictation();
  }
  draw();
}

/* ---------- екран: урок ---------- */
function renderLesson(id){
  const lesson = LESSONS.find(l=>l.id===id);
  if(!lesson){ location.hash='#/'; return; }
  let mode = 'study'; // study | build | quiz
  let grammarOpen = false;

  function speedBtn(){ return `<button class="iconbtn" id="speed" title="Швидкість озвучки">${RATES[rateIdx()].e}</button>`; }

  function shell(inner){
    root.innerHTML = `
      <div class="topbar">
        <button class="backbtn" id="back">← Уроки</button>
        <div class="spacer"></div>
        <div class="brand" style="font-size:14px">${lesson.icon} ${esc(lesson.title)}</div>
        <div class="spacer"></div>
        ${speedBtn()}
      </div>
      <div class="tabs">
        <button data-m="study" class="${mode==='study'?'active':''}">📖 Слова</button>
        <button data-m="build" class="${mode==='build'?'active':''}">🃏 Речення</button>
        <button data-m="quiz"  class="${mode==='quiz'?'active':''}">🎯 Тест</button>
      </div>
      <div id="content">${inner}</div>`;
    root.querySelector('#back').onclick=()=>{ location.hash='#/'; };
    root.querySelector('#speed').onclick=()=>{ setRateIdx((rateIdx()+1)%RATES.length); root.querySelector('#speed').textContent = RATES[rateIdx()].e; };
    root.querySelectorAll('.tabs button').forEach(b=>{
      b.onclick=()=>{
        mode=b.dataset.m;
        root.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active', x===b));
        if(mode==='study') studyDispatch(); else if(mode==='build') build(); else quiz();
      };
    });
  }

  function studyDispatch(){ (lesson.type==='verbs' ? verbsStudy : study)(); }

  /* --- режим «Слова» для дієслів: таблиця спряження --- */
  function verbsStudy(){
    const items = lesson.verbs || [];
    let i = 0;
    function draw(autospeak){
      const v = items[i];
      const g = lesson.grammar ? `
        <div class="grammar">
          <button class="grammar-head" id="gtoggle">📘 Правило <span class="chev">${grammarOpen?'▾':'▸'}</span></button>
          ${grammarOpen?`<div class="grammar-body">${lesson.grammar}</div>`:''}
        </div>` : '';
      const tenses = v.tenses ? v.tenses : [{ t:'', rows:v.forms }];
      const allForms = tenses.reduce((a,t)=>a.concat(t.rows), []);
      let ri = 0;
      const tblHTML = tenses.map(tn=>`
        ${tn.t?`<div class="conj-t">${esc(tn.t)}</div>`:''}
        <table class="conj">
          ${tn.rows.map(f=>`<tr class="conj-row" data-k="${ri++}"><td class="cp">${esc(f.p)}</td><td class="cf">${esc(f.f)}</td><td class="ct">${trHTML(f.tr)}</td></tr>`).join('')}
        </table>`).join('');
      root.querySelector('#content').innerHTML = `
        ${g}
        <div class="counter">${i+1} / ${items.length}</div>
        <div class="stage">
          <div class="card word">
            <div class="tag">СПРЯЖЕННЯ</div>
            ${emojiFor(v.ua)?`<div class="card-pic">${emojiFor(v.ua)}</div>`:''}
            <div class="ua">${esc(v.ua)}</div>
            <div class="en">${esc(v.inf)}</div>
            <div class="tr">${trHTML(v.tr)}</div>
            <button class="speak" id="say">🔊 Інфінітив</button>
            ${tblHTML}
            <div class="conj-hint">тапни рядок, щоб почути форму 🔊</div>
          </div>
          <div class="controls">
            <button class="btn-again" id="again">↻ Повторити</button>
            <button class="btn-know" id="know">✓ Знаю</button>
          </div>
          <div class="controls">
            <button class="btn-nav" id="prev">← Назад</button>
            <button class="btn-nav" id="next">Далі →</button>
          </div>
        </div>`;
      const gt = root.querySelector('#gtoggle'); if(gt) gt.onclick=()=>{ grammarOpen=!grammarOpen; draw(false); };
      const say = v.inf.replace(/^to /,'');
      root.querySelector('#say').onclick = ()=>speak(say);
      root.querySelectorAll('.conj-row').forEach(r=>{ r.onclick=()=>speak(allForms[r.dataset.k].f); });
      if(autospeak!==false) speak(say);
      const go = d => { i=(i+d+items.length)%items.length; draw(); };
      root.querySelector('#prev').onclick = ()=>go(-1);
      root.querySelector('#next').onclick = ()=>go(1);
      root.querySelector('#know').onclick = ()=>{ markKnown(lesson.id,v.inf,true); bumpDaily(); go(1); };
      root.querySelector('#again').onclick = ()=>{ markKnown(lesson.id,v.inf,false); addReview(lesson.id,{en:v.inf,ua:v.ua,tr:v.tr}); go(1); };
    }
    draw();
  }

  /* --- режим «Слова»: флешкарти --- */
  function study(){
    const items = lesson.cards;
    let i = 0, revealed = false;
    function draw(autospeak){
      const c = items[i];
      const pic = emojiFor(c.ua);
      const g = lesson.grammar ? `
        <div class="grammar">
          <button class="grammar-head" id="gtoggle">📘 Правило <span class="chev">${grammarOpen?'▾':'▸'}</span></button>
          ${grammarOpen?`<div class="grammar-body">${lesson.grammar}</div>`:''}
        </div>` : '';
      root.querySelector('#content').innerHTML = `
        ${g}
        <div class="counter">${i+1} / ${items.length}</div>
        <div class="stage">
          <button class="card word flipword" id="wcard">
            <div class="tag">DEUTSCH</div>
            ${pic?`<div class="card-pic">${pic}</div>`:''}
            <div class="en">${esc(c.en)}</div>
            <div class="tr">${trHTML(c.tr)}</div>
            ${revealed ? `<div class="ua-back">${esc(c.ua)}</div>` : `<div class="flip-hint">тапни, щоб побачити переклад 👆</div>`}
            <span class="speak speak-ico" id="say" title="Послухати">🔊</span>
          </button>
          <div class="controls">
            <button class="btn-again" id="again">↻ Повторити</button>
            <button class="btn-know" id="know">✓ Знаю</button>
          </div>
          <div class="controls">
            <button class="btn-nav" id="prev">← Назад</button>
            <button class="btn-nav" id="next">Далі →</button>
          </div>
        </div>`;
      const gt = root.querySelector('#gtoggle'); if(gt) gt.onclick=()=>{ grammarOpen=!grammarOpen; draw(false); };
      root.querySelector('#wcard').onclick = (e)=>{ if(e.target && e.target.id==='say'){ speak(c.en); return; } if(!revealed){ revealed=true; draw(false); speak(c.en); } };
      if(autospeak!==false) speak(c.en);
      const go = d => { revealed=false; i=(i+d+items.length)%items.length; draw(); };
      root.querySelector('#prev').onclick = ()=>go(-1);
      root.querySelector('#next').onclick = ()=>go(1);
      root.querySelector('#know').onclick = ()=>{ markKnown(lesson.id,c.en,true); bumpDaily(); go(1); };
      root.querySelector('#again').onclick = ()=>{ markKnown(lesson.id,c.en,false); addReview(lesson.id,c); go(1); };
    }
    draw();
  }

  /* --- режим «Речення»: флешкартка з фонду вивчених слів --- */
  function build(){
    const c = ()=>root.querySelector('#content');
    const items = sentencePool(lesson);
    const revealedSet = new Set();
    if(!items.length){
      c().innerHTML = `<div class="done-card"><div class="score">📚</div>
        <p>Речень із вивчених слів ще нема.<br>Пройди більше слів у застосунку — і тут зʼявиться практика речень лише зі знайомих слів.</p></div>`;
      return;
    }
    let i = 0;
    function draw(reveal){
      const sn = items[i];
      c().innerHTML = `
        <div class="counter">${i+1} / ${items.length} · речення зі знайомих слів</div>
        <div class="stage">
          <button class="card sentence flipcard" id="flip">
            <div class="tag">РЕЧЕННЯ</div>
            <div class="ua">${esc(sn.ua)}</div>
            ${reveal ? `<div class="en">${esc(sn.en)}</div><div class="tr">${trHTML(sn.tr)}</div><span class="speak speak-ico" id="say" title="Послухати">🔊</span>`
                     : `<div class="flip-hint">тапни, щоб побачити переклад 👆</div>`}
          </button>
          <div class="controls">
            <button class="btn-nav" id="prev">← Назад</button>
            <button class="btn-nav" id="next">Далі →</button>
          </div>
        </div>`;
      c().querySelector('#flip').onclick = (e)=>{ if(e.target && e.target.id==='say'){ speak(sn.en); return; } if(!reveal){ draw(true); speak(sn.en); bumpDaily(); revealedSet.add(i); if(revealedSet.size===items.length) markMeta(lesson.id,'@sent',true); } };
      const go = d => { i=(i+d+items.length)%items.length; draw(false); };
      c().querySelector('#prev').onclick = ()=>go(-1);
      c().querySelector('#next').onclick = ()=>go(1);
    }
    draw(false);
  }

  /* --- режим «Тест»: вибір із варіантів --- */
  function quiz(){
    const qs = shuffle(lesson.cards).map(card=>{
      const askEn = Math.random()<0.5;
      const others = shuffle(lesson.cards.filter(c=>c.en!==card.en)).slice(0,3);
      const opts = shuffle([card, ...others]);
      return { card, askEn, opts };
    });
    let i=0, score=0;
    function draw(){
      if(i>=qs.length){ finish(); return; }
      const {card, askEn, opts} = qs[i];
      root.querySelector('#content').innerHTML = `
        <div class="counter">Питання ${i+1} / ${qs.length}</div>
        <div class="quiz-q">
          <div class="prompt">${askEn?'Що означає слово?':'Як буде німецькою?'}</div>
          <div class="big ${askEn?'':'ua'}">${esc(askEn?card.en:card.ua)}</div>
          ${askEn?`<button class="speak" id="say">🔊</button>`:''}
        </div>
        <div class="options">
          ${opts.map((o,k)=>`<button data-k="${k}">${esc(askEn?o.ua:o.en)}${askEn?'':`<span class="opt-say" data-say="${k}">🔊</span>`}</button>`).join('')}
        </div>`;
      if(askEn){ const s=root.querySelector('#say'); s.onclick=()=>speak(card.en); speak(card.en); }
      const btns = root.querySelectorAll('.options button');
      btns.forEach(b=>{
        b.onclick=(e)=>{
          if(e.target && e.target.dataset && e.target.dataset.say!=null){ speak(opts[e.target.dataset.say].en); return; }
          const chosen = opts[b.dataset.k];
          const ok = chosen.en===card.en;
          if(ok) score++;
          btns.forEach(x=>{ x.disabled=true; const o=opts[x.dataset.k];
            if(o.en===card.en) x.classList.add('correct'); else if(x===b) x.classList.add('wrong'); });
          speak(card.en);
          if(ok){ markKnown(lesson.id,card.en,true); bumpDaily(); } else addReview(lesson.id,card);
          setTimeout(()=>{ i++; draw(); }, 950);
        };
      });
    }
    function finish(){
      const pct=Math.round(score/qs.length*100);
      if(pct===100) markMeta(lesson.id,'@quiz',true);
      const msg = pct===100?'Ідеально! 🎉' : pct>=70?'Добре! Ще трохи 💪' : 'Повтори слова і спробуй ще 🔁';
      root.querySelector('#content').innerHTML = `
        <div class="done-card">
          <div class="score">${score}/${qs.length}</div>
          <p>${msg}</p>
          <button class="primary" id="retry">Пройти ще раз</button>
          <button class="primary" id="build2" style="background:#fff;color:var(--pink)">Збирати речення</button>
        </div>`;
      root.querySelector('#retry').onclick=()=>quiz();
      root.querySelector('#build2').onclick=()=>{ mode='build'; shell(''); build(); };
    }
    draw();
  }

  shell('');
  studyDispatch();
}

/* ---------- маршрутизація ---------- */
function route(){
  const h = location.hash || '#/';
  const m = h.match(/^#\/lesson\/(\d+)/);
  if(m) renderLesson(parseInt(m[1],10));
  else if(h.indexOf('#/review')===0) renderReview();
  else if(h.indexOf('#/vocab')===0) renderVocab();
  else if(h.indexOf('#/dictation')===0) renderDictation();
  else if(h.indexOf('#/premium')===0) renderPremium();
  else renderHome();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', route);
route();

/* ---------- нативний місток: реклама + підписка (тільки в Android-обгортці) ---------- */
if(window.Native && Native.isNative){
  Native.init(function(active){
    setPremium(active);      // синхронізуємо статус підписки з магазину
    route();                 // перемалювати поточний екран з урахуванням статусу
    Native.syncAds(active);  // показати банер (без підписки) або сховати (з підпискою)
  });
}

/* ---------- прибираємо сторонній бейдж хостингу (напр. «Powered by Netlify») ---------- */
(function(){
  function kill(){
    try{
      document.querySelectorAll('a[href*="netlify" i],[id*="netlify" i],[class*="netlify" i]').forEach(function(el){ el.remove(); });
      document.querySelectorAll('iframe').forEach(function(f){
        var n=f;
        while(n && n!==document.body){ var p=getComputedStyle(n).position; if(p==='fixed'||p==='absolute'){ n.remove(); return; } n=n.parentElement; }
        f.remove();
      });
      var b=document.body; if(b){
        b.querySelectorAll('div,a,span,section,aside').forEach(function(el){
          if(el.childElementCount<=1 && /powered by netlify/i.test(el.textContent||'')){
            var n=el;
            while(n && n!==b){ var p=getComputedStyle(n).position; if(p==='fixed'||p==='absolute'){ n.remove(); return; } n=n.parentElement; }
          }
        });
      }
    }catch(e){}
  }
  kill();
  window.addEventListener('load', kill);
  var c=0, t=setInterval(function(){ kill(); if(++c>=20) clearInterval(t); }, 400);
  try{ new MutationObserver(kill).observe(document.body||document.documentElement,{childList:true}); }catch(e){}
})();

/* ---------- service worker (офлайн) ---------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js').catch(()=>{}); });
}

/* Anglo — логіка застосунку.
   Простий SPA на хеш-маршрутах: #/ (список уроків), #/lesson/N.
   Прогрес зберігається в localStorage. */

const root = document.getElementById('main');

/* ---------- прогрес ---------- */
const PKEY = 'anglo.progress.v1';
function loadProgress(){
  try { return JSON.parse(localStorage.getItem(PKEY)) || {}; }
  catch(e){ return {}; }
}
function saveProgress(p){
  try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch(e){}
}
let progress = loadProgress(); // { lessonId: { "en": true } }

function knownCount(lesson){
  const set = progress[lesson.id] || {};
  return lesson.cards.filter(c => set[c.en]).length;
}
function totalCards(){ return LESSONS.reduce((s,l)=>s+l.cards.length,0); }
function totalKnown(){ return LESSONS.reduce((s,l)=>s+knownCount(l),0); }
function markKnown(lessonId, en, val){
  progress[lessonId] = progress[lessonId] || {};
  if(val) progress[lessonId][en] = true; else delete progress[lessonId][en];
  saveProgress(progress);
}

/* ---------- озвучка (TTS) ---------- */
let voice = null;
function pickVoice(){
  const voices = speechSynthesis.getVoices();
  voice = voices.find(v=>/en[-_]US/i.test(v.lang)) ||
          voices.find(v=>/^en/i.test(v.lang)) || null;
}
if('speechSynthesis' in window){
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(text){
  if(!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  if(voice) u.voice = voice;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

/* ---------- утиліти ---------- */
function trHTML(tr){
  // [склад] -> підсвічений наголос
  return tr.replace(/\[([^\]]+)\]/g, '<span class="stress">$1</span>');
}
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];} return a; }
function esc(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

/* ---------- екран: список уроків ---------- */
function renderHome(){
  const known = totalKnown(), total = totalCards();
  const pct = total ? Math.round(known/total*100) : 0;
  root.innerHTML = `
    <div class="topbar">
      <div class="brand"><span class="logo">A</span> Anglo <b>·</b> англійська</div>
      <div class="spacer"></div>
      <button class="iconbtn" id="reset" title="Скинути прогрес">↺</button>
    </div>
    <div class="hero">
      <h1>Англійська з нуля 👋</h1>
      <p>Вчи по одному слову: переклад, звучання і як прочитати вголос.</p>
      <div class="progress">
        <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
        <div class="lbl">Вивчено ${known} із ${total} слів · ${pct}%</div>
      </div>
    </div>
    <div class="lessons">
      ${LESSONS.map(l=>{
        const k = knownCount(l), done = k===l.cards.length && k>0;
        return `<div class="lesson-card" data-id="${l.id}">
          <div class="emoji">${l.icon}</div>
          <div class="meta">
            <h3>${esc(l.title)}</h3>
            <small>${esc(l.subtitle)}</small>
          </div>
          <div class="ring ${done?'badge-done':''}">${done?'✓':k+'/'+l.cards.length}</div>
        </div>`;
      }).join('')}
    </div>
    <p class="hint">Встанови як застосунок: меню браузера → «Додати на головний екран».</p>
  `;
  root.querySelectorAll('.lesson-card').forEach(el=>{
    el.onclick = ()=>{ location.hash = '#/lesson/'+el.dataset.id; };
  });
  root.querySelector('#reset').onclick = ()=>{
    if(confirm('Скинути весь прогрес?')){ progress={}; saveProgress(progress); renderHome(); }
  };
}

/* ---------- екран: урок ---------- */
function renderLesson(id){
  const lesson = LESSONS.find(l=>l.id===id);
  if(!lesson){ location.hash='#/'; return; }
  let mode = 'study'; // study | quiz

  function shell(inner){
    root.innerHTML = `
      <div class="topbar">
        <button class="backbtn" id="back">← Уроки</button>
        <div class="spacer"></div>
        <div class="brand" style="font-size:14px">${lesson.icon} ${esc(lesson.title)}</div>
      </div>
      <div class="tabs">
        <button data-m="study" class="${mode==='study'?'active':''}">📖 Вивчення</button>
        <button data-m="quiz" class="${mode==='quiz'?'active':''}">🎯 Тест</button>
      </div>
      <div id="content">${inner}</div>`;
    root.querySelector('#back').onclick=()=>{ location.hash='#/'; };
    root.querySelectorAll('.tabs button').forEach(b=>{
      b.onclick=()=>{ mode=b.dataset.m; mode==='study'?study():quiz(); };
    });
  }

  /* --- режим вивчення: флешкарти --- */
  function study(){
    const items = lesson.cards.concat(lesson.examples.map(e=>({...e, sentence:true})));
    let i = 0;
    function draw(){
      const c = items[i];
      const isSent = !!c.sentence;
      const html = `
        <div class="counter">${i+1} / ${items.length}</div>
        <div class="stage">
          <div class="card ${isSent?'sentence':'word'}">
            <div class="tag">ANGLO</div>
            ${isSent
              ? `<div class="ua-small">${esc(c.ua)}</div>
                 <div class="en">${esc(c.en)}</div>
                 <div class="tr">${trHTML(c.tr)}</div>`
              : `<div class="ua">${esc(c.ua)}</div>
                 <div class="en">${esc(c.en)}</div>
                 <div class="tr">${trHTML(c.tr)}</div>`}
            <button class="speak" id="say">🔊 Послухати</button>
          </div>
          ${isSent ? `
            <div class="controls">
              <button class="btn-nav" id="prev">← Назад</button>
              <button class="btn-know" id="next">Далі →</button>
            </div>`
          : `
            <div class="controls">
              <button class="btn-again" id="again">↻ Повторити</button>
              <button class="btn-know" id="know">✓ Знаю</button>
            </div>
            <div class="controls">
              <button class="btn-nav" id="prev">← Назад</button>
              <button class="btn-nav" id="next">Далі →</button>
            </div>`}
        </div>`;
      root.querySelector('#content').innerHTML = html;
      root.querySelector('#say').onclick = ()=>speak(c.en);
      speak(c.en);
      const go = d => { i=(i+d+items.length)%items.length; draw(); };
      root.querySelector('#prev').onclick = ()=>go(-1);
      root.querySelector('#next').onclick = ()=>go(1);
      if(!isSent){
        root.querySelector('#know').onclick = ()=>{ markKnown(lesson.id,c.en,true); go(1); };
        root.querySelector('#again').onclick = ()=>{ markKnown(lesson.id,c.en,false); go(1); };
      }
    }
    draw();
  }

  /* --- режим тесту: вибір із варіантів --- */
  function quiz(){
    const qs = shuffle(lesson.cards).map(card=>{
      const askEn = Math.random()<0.5; // питаємо переклад слова / слово за перекладом
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
          <div class="prompt">${askEn?'Що означає слово?':'Як буде англійською?'}</div>
          <div class="big ${askEn?'':'ua'}">${esc(askEn?card.en:card.ua)}</div>
          ${askEn?`<button class="speak" id="say">🔊</button>`:''}
        </div>
        <div class="options">
          ${opts.map((o,k)=>`<button data-k="${k}">${esc(askEn?o.ua:o.en)}</button>`).join('')}
        </div>`;
      if(askEn){ const s=root.querySelector('#say'); s.onclick=()=>speak(card.en); speak(card.en); }
      const btns = root.querySelectorAll('.options button');
      btns.forEach(b=>{
        b.onclick=()=>{
          const chosen = opts[b.dataset.k];
          const ok = chosen.en===card.en;
          if(ok) score++;
          btns.forEach(x=>{
            x.disabled=true;
            const o=opts[x.dataset.k];
            if(o.en===card.en) x.classList.add('correct');
            else if(x===b) x.classList.add('wrong');
          });
          if(ok) markKnown(lesson.id,card.en,true);
          setTimeout(()=>{ i++; draw(); }, 850);
        };
      });
    }
    function finish(){
      const pct=Math.round(score/qs.length*100);
      const msg = pct===100?'Ідеально! 🎉' : pct>=70?'Добре! Ще трохи 💪' : 'Повтори картки і спробуй ще 🔁';
      root.querySelector('#content').innerHTML = `
        <div class="done-card">
          <div class="score">${score}/${qs.length}</div>
          <p>${msg}</p>
          <button class="primary" id="retry">Пройти ще раз</button>
          <button class="primary" id="study2" style="background:#fff;color:var(--pink)">До карток</button>
        </div>`;
      root.querySelector('#retry').onclick=()=>quiz();
      root.querySelector('#study2').onclick=()=>{ mode='study'; shell(''); study(); };
      renderHomeIfNeeded();
    }
    draw();
  }

  shell('');
  study();
}
function renderHomeIfNeeded(){ /* прогрес уже збережено; головний екран оновиться при поверненні */ }

/* ---------- маршрутизація ---------- */
function route(){
  const h = location.hash || '#/';
  const m = h.match(/^#\/lesson\/(\d+)/);
  if(m) renderLesson(parseInt(m[1],10));
  else renderHome();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', route);
route();

/* ---------- service worker (офлайн) ---------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

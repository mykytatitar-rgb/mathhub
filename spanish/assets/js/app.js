/* Hola — логіка застосунку.
   SPA на хеш-маршрутах: #/ (рівні й уроки), #/lesson/N.
   Прогрес і налаштування — у localStorage. */

const root = document.getElementById('main');

/* ---------- прогрес ---------- */
const PKEY = 'hola.progress.v1';
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

/* ---------- швидкість озвучки ---------- */
const RKEY = 'hola.rate';
const RATES = [ {v:0.7, e:'🐢'}, {v:0.85, e:'🚶'}, {v:1.0, e:'🐇'} ];
function rateIdx(){ let i = parseInt(localStorage.getItem(RKEY),10); return (i>=0 && i<RATES.length) ? i : 1; }
function setRateIdx(i){ try{ localStorage.setItem(RKEY, i); }catch(e){} }

/* ---------- озвучка (TTS): беремо найкращий доступний іспанський голос ---------- */
let voice = null;
function scoreVoice(v){
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if(/es[-_]es/i.test(v.lang)) s += 3; else if(/es[-_]mx|es[-_]us/i.test(v.lang)) s += 2; else if(/^es/i.test(v.lang)) s += 1;
  if(/natural|neural|premium|enhanced/.test(n)) s += 6;
  if(/google/.test(n)) s += 4;
  if(/microsoft|apple|monica|jorge|paulina/.test(n)) s += 2;
  if(v.localService === false) s += 1;
  if(/compact|espeak|robo/.test(n)) s -= 4;
  return s;
}
function pickVoice(){
  const vs = (speechSynthesis.getVoices() || []).filter(v => /^es/i.test(v.lang));
  voice = vs.length ? vs.slice().sort((a,b)=>scoreVoice(b)-scoreVoice(a))[0] : null;
}
if('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text){
  if(!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  if(!voice) pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = (voice && voice.lang) || 'es-ES';
  if(voice) u.voice = voice;
  u.rate = RATES[rateIdx()].v;
  u.pitch = 1;
  speechSynthesis.speak(u);
}

/* ---------- утиліти ---------- */
function trHTML(tr){ return tr.replace(/\[([^\]]+)\]/g, '<span class="stress">$1</span>'); }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];} return a; }
function esc(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

/* ---------- екран: рівні й уроки ---------- */
function renderHome(){
  const known = totalKnown(), total = totalCards();
  const pct = total ? Math.round(known/total*100) : 0;
  root.innerHTML = `
    <div class="topbar">
      <div class="brand"><span class="logo">H</span> Hola <b>·</b> іспанська</div>
      <div class="spacer"></div>
      <button class="iconbtn" id="reset" title="Скинути прогрес">↺</button>
    </div>
    <div class="hero">
      <h1>Іспанська з нуля 👋</h1>
      <p>Вчи слова, тренуй вимову і збирай речення — крок за кроком.</p>
      <div class="progress">
        <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
        <div class="lbl">Вивчено ${known} із ${total} слів · ${pct}%</div>
      </div>
    </div>
    ${LEVELS.map(lv=>{
      const ls = LESSONS.filter(l=>l.level===lv.id);
      if(!ls.length) return '';
      const lk = ls.reduce((s,l)=>s+knownCount(l),0);
      const lt = ls.reduce((s,l)=>s+l.cards.length,0);
      return `
        <div class="level">
          <div class="level-head">
            <span class="level-badge">${lv.id}</span>
            <div class="level-meta">
              <div class="level-name">${esc(lv.name)}</div>
              <small>${esc(lv.hint)}</small>
            </div>
            <span class="level-count">${lk}/${lt}</span>
          </div>
          <div class="lessons">
            ${ls.map(l=>{
              const k = knownCount(l), done = k===l.cards.length && k>0;
              return `<div class="lesson-card" data-id="${l.id}">
                <div class="emoji">${l.icon}</div>
                <div class="meta">
                  <h3>${esc(l.title)}</h3>
                  <small>${esc(l.subtitle)} · ${l.cards.length} слів</small>
                </div>
                <div class="ring ${done?'badge-done':''}">${done?'✓':k+'/'+l.cards.length}</div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('')}
    <p class="hint">Встанови як застосунок: меню браузера → «Додати на головний екран».</p>
  `;
  root.querySelectorAll('.lesson-card').forEach(el=>{ el.onclick = ()=>{ location.hash = '#/lesson/'+el.dataset.id; }; });
  root.querySelector('#reset').onclick = ()=>{ if(confirm('Скинути весь прогрес?')){ progress={}; saveProgress(progress); renderHome(); } };
}

/* ---------- екран: урок ---------- */
function renderLesson(id){
  const lesson = LESSONS.find(l=>l.id===id);
  if(!lesson){ location.hash='#/'; return; }
  let mode = 'study'; // study | build | quiz

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
        <button data-m="build" class="${mode==='build'?'active':''}">🧩 Речення</button>
        <button data-m="quiz"  class="${mode==='quiz'?'active':''}">🎯 Тест</button>
      </div>
      <div id="content">${inner}</div>`;
    root.querySelector('#back').onclick=()=>{ location.hash='#/'; };
    root.querySelector('#speed').onclick=()=>{ setRateIdx((rateIdx()+1)%RATES.length); root.querySelector('#speed').textContent = RATES[rateIdx()].e; };
    root.querySelectorAll('.tabs button').forEach(b=>{
      b.onclick=()=>{ mode=b.dataset.m; if(mode==='study') study(); else if(mode==='build') build(); else quiz(); };
    });
  }

  /* --- режим «Слова»: флешкарти --- */
  function study(){
    const items = lesson.cards;
    let i = 0;
    function draw(){
      const c = items[i];
      root.querySelector('#content').innerHTML = `
        <div class="counter">${i+1} / ${items.length}</div>
        <div class="stage">
          <div class="card word">
            <div class="tag">HOLA</div>
            <div class="ua">${esc(c.ua)}</div>
            <div class="en">${esc(c.en)}</div>
            <div class="tr">${trHTML(c.tr)}</div>
            <button class="speak" id="say">🔊 Послухати</button>
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
      root.querySelector('#say').onclick = ()=>speak(c.en);
      speak(c.en);
      const go = d => { i=(i+d+items.length)%items.length; draw(); };
      root.querySelector('#prev').onclick = ()=>go(-1);
      root.querySelector('#next').onclick = ()=>go(1);
      root.querySelector('#know').onclick = ()=>{ markKnown(lesson.id,c.en,true); go(1); };
      root.querySelector('#again').onclick = ()=>{ markKnown(lesson.id,c.en,false); go(1); };
    }
    draw();
  }

  /* --- режим «Речення»: збери речення з плиток --- */
  function build(){
    const items = lesson.sentences || [];
    if(!items.length){ root.querySelector('#content').innerHTML = `<div class="done-card"><p>Тут поки немає речень.</p></div>`; return; }
    let i = 0;
    function draw(){
      if(i>=items.length){ finish(); return; }
      const s = items[i];
      const tokens = s.en.split(' ').map((w,idx)=>({w, idx}));
      const bank = shuffle(tokens);
      let answer = [];
      function render(){
        const done = answer.length === tokens.length;
        root.querySelector('#content').innerHTML = `
          <div class="counter">Речення ${i+1} / ${items.length}</div>
          <div class="build-q">
            <div class="prompt">Збери іспанське речення:</div>
            <div class="build-ua">${esc(s.ua)}</div>
            <div class="answer" id="answer">
              ${answer.length ? answer.map((t,k)=>`<button class="tile placed" data-k="${k}">${esc(t.w)}</button>`).join('')
                              : '<span class="ans-empty">тапай слова нижче…</span>'}
            </div>
            <div class="bank" id="bank">
              ${bank.map((t,k)=>`<button class="tile" data-b="${k}" ${answer.indexOf(t)>-1?'disabled':''}>${esc(t.w)}</button>`).join('')}
            </div>
            <div class="controls">
              <button class="btn-nav" id="clear">Очистити</button>
              <button class="btn-know" id="check" ${done?'':'disabled'}>Перевірити</button>
            </div>
            <div id="fb" class="build-fb"></div>
          </div>`;
        root.querySelectorAll('#bank .tile').forEach(b=>{ if(!b.disabled) b.onclick=()=>{ answer.push(bank[b.dataset.b]); render(); }; });
        root.querySelectorAll('#answer .tile.placed').forEach(b=>{ b.onclick=()=>{ answer.splice(+b.dataset.k,1); render(); }; });
        root.querySelector('#clear').onclick=()=>{ answer=[]; render(); };
        const chk = root.querySelector('#check');
        if(!chk.disabled) chk.onclick=check;
      }
      function check(){
        const got = answer.map(t=>t.w).join(' ');
        const fb = root.querySelector('#fb');
        if(got === s.en){
          fb.innerHTML = `<div class="fb-ok">✓ Правильно! <span class="fb-tr">${trHTML(s.tr)}</span></div>`;
          root.querySelectorAll('.tile').forEach(x=>x.disabled=true);
          markKnown(lesson.id, '§'+s.en, true);
          speak(s.en);
          setTimeout(()=>{ i++; draw(); }, 1400);
        } else {
          fb.innerHTML = `<div class="fb-no">Ще ні — перевір порядок слів 🔁</div>`;
        }
      }
      render();
    }
    function finish(){
      root.querySelector('#content').innerHTML = `
        <div class="done-card">
          <div class="score">🧩</div>
          <p>Усі речення зібрано! Це найкраща практика граматики.</p>
          <button class="primary" id="again">Ще раз</button>
          <button class="primary" id="tostudy" style="background:#fff;color:var(--pink)">До слів</button>
        </div>`;
      root.querySelector('#again').onclick=()=>build();
      root.querySelector('#tostudy').onclick=()=>{ mode='study'; shell(''); study(); };
    }
    draw();
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
          <div class="prompt">${askEn?'Що означає слово?':'Як буде іспанською?'}</div>
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
          btns.forEach(x=>{ x.disabled=true; const o=opts[x.dataset.k];
            if(o.en===card.en) x.classList.add('correct'); else if(x===b) x.classList.add('wrong'); });
          if(ok) markKnown(lesson.id,card.en,true);
          setTimeout(()=>{ i++; draw(); }, 850);
        };
      });
    }
    function finish(){
      const pct=Math.round(score/qs.length*100);
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
  study();
}

/* ---------- маршрутизація ---------- */
function route(){
  const h = location.hash || '#/';
  const m = h.match(/^#\/lesson\/(\d+)/);
  if(m) renderLesson(parseInt(m[1],10)); else renderHome();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', route);
route();

/* ---------- service worker (офлайн) ---------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js').catch(()=>{}); });
}

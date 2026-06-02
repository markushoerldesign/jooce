// ── Supabase Config – trage hier deine eigenen Werte ein ──
const SUPABASE_URL = 'https://rhthtidolapnfrmmsojs.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJodGh0aWRvbGFwbmZybW1zb2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTE3OTAsImV4cCI6MjA5NTk4Nzc5MH0.YT8qp6ierdW4DoiquaSf-DkEU_wJjEtsWVp66SngZec";

// ── State ──
let maxPicks = 1, myPicks = [], answers = [], question = '';
let countdownTimer = null, countdownSec = 30;
let sessionId = null;

// ── Supabase Helper ──
async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || '',
      ...options.headers
    }
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

// ── Glass SVG icon ──
function glassIcon(filled) {
  const id = 'gc' + Math.random().toString(36).slice(2);
  return `<svg width="22" height="26" viewBox="0 0 22 26" fill="none">
    <defs><clipPath id="${id}"><rect x="2" y="4" width="18" height="19" rx="2"/></clipPath></defs>
    <rect x="2" y="4" width="18" height="19" rx="2"
      fill="${filled ? '#FFF3E8' : '#fff'}" stroke="#F97316" stroke-width="1.3"/>
    <path d="M4.5 4 L3.5 1 L18.5 1 L17.5 4"
      stroke="#F97316" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${filled
      ? `<rect x="2" y="13" width="18" height="10" fill="#FDBA74" opacity="0.85" clip-path="url(#${id})"/>
         <path d="M4 13 Q11 10 18 13" stroke="#F97316" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.6"/>
         <circle cx="8" cy="17" r="1.2" fill="#F97316" opacity="0.35"/>
         <circle cx="13" cy="19" r="0.9" fill="#F97316" opacity="0.3"/>`
      : `<path d="M6 13 Q11 17 16 13" stroke="#F97316" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.4"/>`
    }
  </svg>`;
}

// ── Big glass for result screen ──
function bigGlassIcon() {
  return `<svg width="64" height="74" viewBox="0 0 64 74" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="bgc"><rect x="6" y="12" width="52" height="54" rx="6"/></clipPath></defs>
    <rect x="6" y="12" width="52" height="54" rx="6" fill="#FFF3E8" stroke="#F97316" stroke-width="2"/>
    <path d="M14 12 L11 3 L53 3 L50 12" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="6" y="40" width="52" height="26" fill="#FDBA74" opacity="0.85" clip-path="url(#bgc)"/>
    <path d="M10 40 Q32 33 54 40" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.7"/>
    <circle cx="22" cy="52" r="3.5" fill="#F97316" opacity="0.35"/>
    <circle cx="38" cy="57" r="2.5" fill="#F97316" opacity="0.3"/>
    <circle cx="46" cy="49" r="2" fill="#F97316" opacity="0.25"/>
  </svg>`;
}

// ── Build answer row (Person A) ──
function makeRow(n) {
  const row = document.createElement('div');
  row.className = 'answer-row';
  row.innerHTML = `
    <button class="ai-btn" onclick="genOne(this)" title="KI generiert diese Antwort">
      <i class="ti ti-sparkles"></i>
    </button>
    <div class="glass-check" onclick="toggleCheck(this)" title="Meine Antwort" data-filled="0">
      ${glassIcon(false)}
    </div>
    <div class="answer-field">
      <input type="text" placeholder="Antwort ${n}" />
      <button class="del-btn" onclick="delRow(this)" aria-label="Entfernen">
        <i class="ti ti-x"></i>
      </button>
    </div>`;
  return row;
}

// ── Build answer choice (Person B) – same glass design ──
function makeChoiceRow(text, origI, bSelArr, maxP) {
  const d = document.createElement('div');
  d.className = 'answer-row';
  d.innerHTML = `
    <div class="add-spacer"></div>
    <div class="glass-check b-glass" data-filled="0" data-idx="${origI}" title="Antwort wählen">
      ${glassIcon(false)}
    </div>
    <div class="answer-field">
      <input type="text" value="${text}" disabled style="cursor:default;" />
    </div>`;
  d.querySelector('.b-glass').onclick = function() {
    const filled = this.dataset.filled === '1';
    if (filled) {
      this.dataset.filled = '0';
      this.innerHTML = glassIcon(false);
      const i = bSelArr.indexOf(origI);
      if (i > -1) bSelArr.splice(i, 1);
    } else {
      if (bSelArr.length >= maxP) {
        // deselect oldest
        const oldIdx = bSelArr.shift();
        const oldEl = document.querySelector(`.b-glass[data-idx="${oldIdx}"]`);
        if (oldEl) { oldEl.dataset.filled = '0'; oldEl.innerHTML = glassIcon(false); }
      }
      this.dataset.filled = '1';
      this.innerHTML = glassIcon(true);
      bSelArr.push(origI);
    }
  };
  return d;
}

function init() {
  const list = document.getElementById('answers-list');
  list.innerHTML = '';
  for (let i = 1; i <= 4; i++) list.appendChild(makeRow(i));

  const params = new URLSearchParams(window.location.search);
  const qId = params.get('q');
  if (qId) loadPersonB(qId);
}
init();

// ── KI: call Vercel serverless function ──
async function genOne(btn) {
  const row   = btn.parentElement;
  const input = row.querySelector('input');
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinning" style="font-size:13px">↻</span>';

  const q = document.getElementById('q-input').value.trim();
  const existing = Array.from(document.getElementById('answers-list')
    .querySelectorAll('input')).map(i => i.value.trim()).filter(Boolean);

try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': "DEIN-ANTHROPIC-KEY",
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: `Generiere eine einzige kurze Antwort für die Frage: "${document.getElementById('q-input').value}". Vorhandene Antworten: ${Array.from(document.getElementById('answers-list').querySelectorAll('input')).map(i=>i.value).filter(Boolean).join(', ')}. Antworte NUR mit dem Text, keine Erklärung.` }]
      })
    });
    const data = await res.json();
    input.value = data.content?.[0]?.text?.trim() || '';
  } catch(e) {
    const pool = detectPoolLocal(q, existing);
    const avail = pool.filter(p => !existing.includes(p));
    input.value = (avail.length ? avail : pool)[Math.floor(Math.random() * (avail.length || pool.length))];
  }

function detectPoolLocal(q, existing) {
  const pools = {
    s_machen: ['Kino','Zuhause','Spazieren','Freunde treffen','Sport','Restaurant','Kochen','Konzert'],
    l_machen: ['Ich würde gerne ins Kino gehen','Lieber zu Hause bleiben','Einen Spaziergang machen','Freunde treffen','Sport machen','In ein Restaurant gehen'],
    s_essen:  ['Pizza','Sushi','Pasta','Burger','Salat','Thai','Ramen','Döner'],
    l_essen:  ['Ich hätte Lust auf Pizza','Sushi wäre perfekt','Pasta geht immer','Ein saftiger Burger'],
    def:      ['Option A','Option B','Option C','Option D','Option E'],
  };
  const long = existing.some(v => v.split(' ').length > 3);
  const ql = (q || '').toLowerCase();
  if (ql.match(/machen|heute|abend|wochenende|plan/)) return long ? pools.l_machen : pools.s_machen;
  if (ql.match(/essen|food|hunger|kochen|resto/))     return long ? pools.l_essen  : pools.s_essen;
  return pools.def;
}

// ── Toggle glass check (Person A) ──
function toggleCheck(el) {
  const rows = Array.from(document.getElementById('answers-list').querySelectorAll('.answer-row'));
  const idx  = rows.indexOf(el.closest('.answer-row'));
  const filled = el.dataset.filled === '1';
  if (filled) {
    el.dataset.filled = '0'; el.innerHTML = glassIcon(false);
    myPicks = myPicks.filter(x => x !== idx);
  } else {
    if (myPicks.length >= maxPicks) {
      const old = myPicks.shift();
      const oldEl = rows[old].querySelector('.glass-check');
      oldEl.dataset.filled = '0'; oldEl.innerHTML = glassIcon(false);
    }
    el.dataset.filled = '1'; el.innerHTML = glassIcon(true);
    myPicks.push(idx);
  }
}

function chgCount(d) {
  const n = document.getElementById('answers-list').querySelectorAll('.answer-row').length;
  maxPicks = Math.max(1, Math.min(n, maxPicks + d));
  document.getElementById('count-num').textContent = maxPicks;
}

function addRow() {
  const list = document.getElementById('answers-list');
  list.appendChild(makeRow(list.querySelectorAll('.answer-row').length + 1));
}
function delRow(btn) {
  const list = document.getElementById('answers-list');
  if (list.querySelectorAll('.answer-row').length > 2)
    btn.closest('.answer-row').remove();
}

// ── Generate link & save ──
async function generateLink() {
  question = document.getElementById('q-input').value.trim() || 'Was möchtest du heute machen?';
  const rows = Array.from(document.getElementById('answers-list').querySelectorAll('.answer-row'));
  answers = rows.map(r => r.querySelector('input').value.trim()).filter(Boolean);
  if (!answers.length) { alert('Bitte füge mindestens eine Antwort hinzu!'); return; }
  if (!myPicks.length) { alert('Bitte wähle mindestens eine Antwort!'); return; }

  const btn = document.getElementById('gen-link-btn');
  btn.innerHTML = '<span class="spinning">↻</span> Wird gespeichert...';
  btn.disabled = true;

  try {
    sessionId = makeId();
    await sbFetch('sessions', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({ id: sessionId, question, answers, picks_a: myPicks, max_picks: maxPicks })
    });

    document.getElementById('answers-list').querySelectorAll('input').forEach(i => i.disabled = true);
    document.getElementById('answers-list').querySelectorAll('.ai-btn,.del-btn,.glass-check')
      .forEach(b => b.style.pointerEvents = 'none');
    document.querySelector('.add-row').style.display  = 'none';
    document.querySelector('.info-box').style.display = 'none';
    btn.style.display = 'none';

    const link = `${window.location.origin}${window.location.pathname}?q=${sessionId}`;
    document.getElementById('link-display').textContent = link;
    document.getElementById('phase-waiting').style.display = 'block';
    startCountdown();
  } catch (e) {
    alert('Fehler beim Speichern: ' + e.message);
    btn.innerHTML = '<i class="ti ti-link"></i> Link generieren';
    btn.disabled = false;
  }
}

// ── Countdown & polling ──
function startCountdown() {
  countdownSec = 30;
  document.getElementById('countdown').textContent = '30s';
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(async () => {
    countdownSec--;
    document.getElementById('countdown').textContent = countdownSec + 's';
    if (countdownSec <= 0) { countdownSec = 30; await checkForResult(); }
  }, 1000);
}

async function checkForResult() {
  if (!sessionId) return;
  const data = await sbFetch(`sessions?id=eq.${sessionId}&select=picks_b,answers,question`);
  if (data && data[0] && data[0].picks_b) {
    clearInterval(countdownTimer);
    answers  = data[0].answers;
    question = data[0].question;
    document.getElementById('phase-waiting').style.display = 'none';
    showResult(data[0].picks_b);
  }
}

function copyLink() {
  const link = document.getElementById('link-display').textContent;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.innerHTML = '<i class="ti ti-check"></i> Kopiert!';
    setTimeout(() => btn.innerHTML = '<i class="ti ti-copy"></i> Kopieren', 2000);
  });
}

// ── Person B: load from URL ──
async function loadPersonB(qId) {
  document.getElementById('phase-create').style.display = 'none';

  try {
    const data = await sbFetch(`sessions?id=eq.${qId}&select=*`);
    if (!data || !data[0]) {
      document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;text-align:center;"><br><br>❌ Link ungültig oder abgelaufen.</div>';
      return;
    }
    const session = data[0];
    if (session.picks_b) { showResultPage(session); return; }

    sessionId = qId;
    answers   = session.answers;
    myPicks   = session.picks_a;
    maxPicks  = session.max_picks;
    question  = session.question;

    document.getElementById('q-display-b').textContent = question;
    document.getElementById('q-meta-b').textContent    = `Wähle bis zu ${maxPicks} Antwort${maxPicks > 1 ? 'en' : ''}`;

    const shuffled = [...answers].sort(() => Math.random() - 0.5);
    let bSel = [];
    const bc = document.getElementById('b-choices');
    bc.innerHTML = '';
    shuffled.forEach(a => {
      const origI = answers.indexOf(a);
      bc.appendChild(makeChoiceRow(a, origI, bSel, maxPicks));
    });
    document.getElementById('b-send-btn')._bSel = bSel;
    document.getElementById('phase-personb').style.display = 'block';
  } catch (e) {
    document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;">Fehler: ' + e.message + '</div>';
  }
}

// ── Person B submits ──
async function submitB() {
  const bSel = document.getElementById('b-send-btn')._bSel || [];
  if (!bSel.length) { alert('Bitte wähle mindestens eine Antwort!'); return; }

  const btn = document.getElementById('b-send-btn');
  btn.innerHTML = '<span class="spinning">↻</span> Wird gespeichert...';
  btn.disabled = true;

  try {
    await sbFetch(`sessions?id=eq.${sessionId}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ picks_b: bSel })
    });
    document.getElementById('phase-personb').style.display = 'none';
    showResult(bSel);
  } catch (e) {
    alert('Fehler: ' + e.message);
    btn.innerHTML = 'Senden';
    btn.disabled = false;
  }
}

// ── Show result (both A and B) ──
function showResult(bSel) {
  const matches = myPicks.filter(i => bSel.includes(i));

  // Build result screen
  const matchCount = matches.length;
  const resultEl = document.getElementById('phase-result');

  let matchesHtml = '';
  matches.forEach(i => {
    matchesHtml += `
      <div class="result-match-row fadein">
        <div class="result-glass">${glassIcon(true)}</div>
        <span class="result-match-text">${answers[i]}</span>
      </div>`;
  });

  resultEl.innerHTML = `
    <div class="result-center">
      <div class="result-big-glass">${bigGlassIcon()}</div>
      <div class="result-title">
        ${matchCount === 0
          ? 'Kein gemeinsames Match'
          : matchCount === 1
            ? '1 gemeinsame Antwort'
            : `${matchCount} gemeinsame Antworten`}
      </div>
      <div class="result-sub">
        ${matchCount === 0
          ? 'Ihr habt diesmal nichts Gemeinsames gewählt 🤔'
          : matches.length === Math.max(myPicks.length, bSel.length)
            ? 'Perfektes Match – ihr denkt genau gleich! 🎉'
            : 'Das habt ihr beide gewählt:'}
      </div>
      ${matchesHtml}
      <div class="secret-note" style="margin-top:1.5rem;">
        <i class="ti ti-lock" style="font-size:13px;flex-shrink:0;margin-top:1px;color:#F97316"></i>
        Was jeder für sich alleine gewählt hat, bleibt geheim.
      </div>
      <button class="secondary-btn" style="margin-top:1rem;" onclick="resetAll()">Neue Frage erstellen</button>
    </div>`;

  resultEl.style.display = 'block';
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showResultPage(session) {
  answers  = session.answers;
  myPicks  = session.picks_a;
  question = session.question;
  document.getElementById('phase-create').style.display = 'none';
  showResult(session.picks_b);
}

// ── Reset ──
function resetAll() {
  myPicks = []; answers = []; question = ''; maxPicks = 1; sessionId = null;
  if (countdownTimer) clearInterval(countdownTimer);
  document.getElementById('count-num').textContent = '1';
  document.getElementById('q-input').value = '';
  init();
  document.querySelector('.add-row').style.display  = '';
  document.querySelector('.info-box').style.display = '';
  const gb = document.getElementById('gen-link-btn');
  gb.style.display = ''; gb.innerHTML = '<i class="ti ti-link"></i> Link generieren'; gb.disabled = false;
  document.getElementById('phase-create').style.display  = 'block';
  document.getElementById('phase-waiting').style.display = 'none';
  document.getElementById('phase-personb').style.display = 'none';
  document.getElementById('phase-result').style.display  = 'none';
  window.history.pushState({}, '', window.location.pathname);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Config – trage hier deine eigenen Werte ein ──
const SUPABASE_URL = "https://rhthtidolapnfrmmsojs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJodGh0aWRvbGFwbmZybW1zb2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTE3OTAsImV4cCI6MjA5NTk4Nzc5MH0.YT8qp6ierdW4DoiquaSf-DkEU_wJjEtsWVp66SngZec";

// ── State ──
let maxPicks = 1, myPicks = [], answers = [], question = '';
let pollTimer = null;
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

// ── Glass SVG (Logo shape) ──
function glassIcon(filled) {
  const id = 'gc' + Math.random().toString(36).slice(2);
  return `<svg width="24" height="26" viewBox="0 0 32 32" fill="none">
    <defs><clipPath id="${id}"><rect x="8" y="10" width="16" height="18" rx="3"/></clipPath></defs>
    <rect x="8" y="10" width="16" height="18" rx="3"
      fill="${filled ? '#FFF3E8' : 'var(--bg)'}" stroke="#F97316" stroke-width="1.5"/>
    <path d="M11 10 L10 6 L22 6 L21 10"
      stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${filled
      ? `<rect x="8" y="20" width="16" height="8" fill="#FDBA74" opacity="0.9" clip-path="url(#${id})"/>
         <path d="M10 20 Q16 17 22 20" stroke="#F97316" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.6"/>
         <circle cx="13" cy="23" r="1.2" fill="#F97316" opacity="0.35"/>
         <circle cx="18" cy="25" r="0.9" fill="#F97316" opacity="0.3"/>`
      : `<path d="M12 14 Q16 19 20 14" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.4"/>
         <circle cx="16" cy="21" r="2" fill="#F97316" opacity="0.15"/>`
    }
  </svg>`;
}

// ── Big glass for result & waiting ──
function bigGlass(pct) {
  const fillY = 28 - (18 * pct);
  const fillH = 18 * pct;
  return `<svg width="72" height="80" viewBox="0 0 32 32" fill="none">
    <defs><clipPath id="bg"><rect x="8" y="10" width="16" height="18" rx="3"/></clipPath></defs>
    <rect x="8" y="10" width="16" height="18" rx="3" fill="#FFF3E8" stroke="#F97316" stroke-width="1.5"/>
    <path d="M11 10 L10 6 L22 6 L21 10" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${pct > 0 ? `
      <rect x="8" y="${fillY}" width="16" height="${fillH + 2}" fill="#FDBA74" opacity="0.85" clip-path="url(#bg)"/>
      <path d="M10 ${fillY} Q16 ${fillY - 2} 22 ${fillY}" stroke="#F97316" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.6"/>
      <circle cx="13" cy="${fillY + 4}" r="1.2" fill="#F97316" opacity="0.35"/>
      <circle cx="18" cy="${fillY + 7}" r="0.9" fill="#F97316" opacity="0.3"/>
    ` : `
      <path d="M12 14 Q16 19 20 14" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.4"/>
      <circle cx="16" cy="21" r="2" fill="#F97316" opacity="0.15"/>
    `}
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
  if (list) {
    list.innerHTML = '';
    for (let i = 1; i <= 4; i++) list.appendChild(makeRow(i));
  }
  const params = new URLSearchParams(window.location.search);
  const qId = params.get('q');
  if (qId) loadPersonB(qId);
}
init();

// ── KI: Supabase Edge Function ──
async function genOne(btn) {
  const row = btn.parentElement;
  const input = row.querySelector('input');
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinning" style="font-size:13px">↻</span>';

  const q = document.getElementById('q-input').value.trim();
  const existing = Array.from(document.getElementById('answers-list').querySelectorAll('input'))
    .map(i => i.value.trim()).filter(Boolean);

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/hyper-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ question: q, existing })
    });
    const data = await res.json();
    input.value = data.answer || '';
  } catch(e) {
    const pool = detectPoolLocal(q, existing);
    const avail = pool.filter(p => !existing.includes(p));
    input.value = (avail.length ? avail : pool)[Math.floor(Math.random() * (avail.length || pool.length))];
  }

  btn.classList.remove('loading');
  btn.innerHTML = '<i class="ti ti-sparkles"></i>';
  input.style.borderColor = '#F97316';
  setTimeout(() => input.style.borderColor = '', 800);
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

// ── Toggle glass (Person A) ──
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

// ── Generate link ──
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

    const link = `${window.location.origin}${window.location.pathname}?q=${sessionId}`;
    showWaiting(link);
  } catch (e) {
    alert('Fehler beim Speichern: ' + e.message);
    btn.innerHTML = '<i class="ti ti-link"></i> Link generieren';
    btn.disabled = false;
  }
}

// ── Show waiting screen (Person A) ──
function showWaiting(link) {
  document.getElementById('phase-create').style.display = 'none';

  const app = document.getElementById('app');
  const waiting = document.createElement('div');
  waiting.id = 'phase-waiting-screen';
  waiting.innerHTML = `
    <div class="logo">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
        <rect x="8" y="10" width="16" height="18" rx="3" fill="#FFF3E8" stroke="#F97316" stroke-width="1.5"/>
        <path d="M11 10 L10 6 L22 6 L21 10" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M12 14 Q16 19 20 14" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <circle cx="16" cy="21" r="2" fill="#F97316" opacity="0.4"/>
      </svg>
      <span class="logo-text">jooce<em>.</em></span>
    </div>
    <div class="waiting-center">
      <div class="waiting-glass" id="waiting-glass">${bigGlass(0)}</div>
      <div class="waiting-title">Warte auf die Antwort<br>der anderen Person</div>
      <div class="waiting-sub" id="waiting-sub">Wird in <span id="poll-countdown">15</span>s neu geprüft</div>
      <div class="link-box" style="margin-top:1.5rem;">
        <span class="link-text">${link}</span>
        <button class="copy-btn" onclick="copyLink('${link}')"><i class="ti ti-copy"></i> Kopieren</button>
      </div>
      <button class="share-btn" onclick="shareLink('${link}')">
        <i class="ti ti-share"></i> Link teilen
      </button>
      <button class="secondary-btn" style="margin-top:0.5rem;" onclick="resetAll()">Neue Frage erstellen</button>
    </div>`;
  app.appendChild(waiting);

  startPolling();
}

// ── Polling every 15s ──
function startPolling() {
  let sec = 15;
  const el = document.getElementById('poll-countdown');
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    sec--;
    if (el) el.textContent = sec;
    if (sec <= 0) {
      sec = 15;
      await checkForResult();
    }
  }, 1000);
  checkForResult();
}

async function checkForResult() {
  if (!sessionId) return;
  const data = await sbFetch(`sessions?id=eq.${sessionId}&select=picks_b,answers,question`);
  if (data && data[0] && data[0].picks_b) {
    clearInterval(pollTimer);
    answers  = data[0].answers;
    question = data[0].question;
    const waiting = document.getElementById('phase-waiting-screen');
    if (waiting) waiting.remove();
    showResult(data[0].picks_b);
  }
}

function copyLink(link) {
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.innerHTML = '<i class="ti ti-check"></i> Kopiert!';
    setTimeout(() => btn.innerHTML = '<i class="ti ti-copy"></i> Kopieren', 2000);
  });
}

function shareLink(link) {
  if (navigator.share) {
    navigator.share({
      title: 'jooce – Beantworte meine Frage!',
      text: 'Ich habe eine Frage für dich auf jooce!',
      url: link
    });
  } else {
    // Fallback: WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent('Ich habe eine Frage für dich auf jooce! ' + link)}`, '_blank');
  }
}

// ── Person B: load from URL ──
async function loadPersonB(qId) {
  document.getElementById('phase-create').style.display = 'none';
  try {
    const data = await sbFetch(`sessions?id=eq.${qId}&select=*`);
    if (!data || !data[0]) {
      document.getElementById('app').innerHTML = `
        <div class="logo">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <rect x="8" y="10" width="16" height="18" rx="3" fill="#FFF3E8" stroke="#F97316" stroke-width="1.5"/>
            <path d="M11 10 L10 6 L22 6 L21 10" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M12 14 Q16 19 20 14" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <circle cx="16" cy="21" r="2" fill="#F97316" opacity="0.4"/>
          </svg>
          <span class="logo-text">jooce<em>.</em></span>
        </div>
        <div style="text-align:center;padding:2rem 0;color:var(--text-secondary);">❌ Link ungültig oder abgelaufen.</div>`;
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
    console.error(e);
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

// ── Show result ──
function showResult(bSel) {
  const matches = myPicks.filter(i => bSel.includes(i));
  const matchCount = matches.length;

  let matchesHtml = '';
  matches.forEach(i => {
    matchesHtml += `
      <div class="result-match-row fadein">
        <div class="result-glass">${glassIcon(true)}</div>
        <span class="result-match-text">${answers[i]}</span>
      </div>`;
  });

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="result-center">
      <div class="logo" style="justify-content:center;margin-bottom:1.5rem;">
        <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
          <rect x="8" y="10" width="16" height="18" rx="3" fill="#FFF3E8" stroke="#F97316" stroke-width="1.5"/>
          <path d="M11 10 L10 6 L22 6 L21 10" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M12 14 Q16 19 20 14" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <circle cx="16" cy="21" r="2" fill="#F97316" opacity="0.4"/>
        </svg>
        <span class="logo-text">jooce<em>.</em></span>
      </div>
      <div class="result-big-glass">${bigGlass(matchCount > 0 ? 0.7 : 0)}</div>
      <div class="result-title">
        ${matchCount === 0
          ? 'Kein gemeinsames Match'
          : matchCount === 1 ? '1 gemeinsame Antwort'
          : `${matchCount} gemeinsame Antworten`}
      </div>
      <div class="result-sub">
        ${matchCount === 0
          ? 'Ihr habt diesmal nichts Gemeinsames gewählt 🤔'
          : matchCount === Math.max(myPicks.length, bSel.length)
            ? 'Perfektes Match – ihr denkt genau gleich! 🎉'
            : 'Das habt ihr beide gewählt:'}
      </div>
      ${matchesHtml}
      <div class="secret-note" style="margin-top:1.5rem;width:100%;">
        <i class="ti ti-lock" style="font-size:13px;flex-shrink:0;margin-top:1px;color:#F97316"></i>
        Was jeder für sich alleine gewählt hat, bleibt geheim.
      </div>
      <button class="secondary-btn" style="margin-top:1rem;width:100%;" onclick="location.href=location.pathname">Neue Frage erstellen</button>
    </div>`;
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
  if (pollTimer) clearInterval(pollTimer);
  location.href = location.pathname;
}

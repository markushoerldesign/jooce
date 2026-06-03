// ── Config – trage hier deine eigenen Werte ein ──
const SUPABASE_URL = "https://rhthtidolapnfrmmsojs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJodGh0aWRvbGFwbmZybW1zb2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTE3OTAsImV4cCI6MjA5NTk4Nzc5MH0.YT8qp6ierdW4DoiquaSf-DkEU_wJjEtsWVp66SngZec";

// ── State ──
let maxPicks = 1, myPicks = [], answers = [], question = '';
let pollTimer = null;
let sessionId = null;

// ── Dummy ads ──
const ADS = [
  { text: "Deine Werbung hier", sub: "werbung@jooce.app", bg: "#FFF3E8", color: "#F97316" },
  { text: "Jooce Premium", sub: "Noch mehr Spass mit Jooce Pro", bg: "#F0FDF4", color: "#16A34A" },
  { text: "Advertise with us", sub: "reach@jooce.app", bg: "#EFF6FF", color: "#3B82F6" },
];
function randomAd() {
  return ADS[Math.floor(Math.random() * ADS.length)];
}

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
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Logo SVG ──
function logoSvg(size) {
  const s = size || 30;
  return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none">
    <rect x="8" y="10" width="16" height="18" rx="3" fill="#FFF3E8" stroke="#F97316" stroke-width="1.5"/>
    <path d="M11 10 L10 6 L22 6 L21 10" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M12 14 Q16 19 20 14" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <circle cx="16" cy="21" r="2" fill="#F97316" opacity="0.4"/>
  </svg>`;
}

function logoHtml() {
  return `<div class="logo">${logoSvg(30)}<span class="logo-text">jooce<em>.</em></span></div>`;
}

// ── Glass SVG (logo shape) ──
function glassIcon(filled) {
  const id = 'gc' + Math.random().toString(36).slice(2);
  const fillY = filled ? 16 : 99;
  return `<svg width="24" height="26" viewBox="0 0 32 32" fill="none">
    <defs><clipPath id="${id}"><rect x="8" y="10" width="16" height="18" rx="3"/></clipPath></defs>
    <rect x="8" y="10" width="16" height="18" rx="3"
      fill="${filled ? '#FFF3E8' : 'var(--bg)'}" stroke="#F97316" stroke-width="1.5"/>
    <path d="M11 10 L10 6 L22 6 L21 10"
      stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${filled
      ? `<rect x="8" y="${fillY}" width="16" height="${28 - fillY}" fill="#FDBA74" opacity="0.9" clip-path="url(#${id})"/>
         <path d="M10 ${fillY} Q16 ${fillY-2} 22 ${fillY}" stroke="#F97316" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.6"/>
         <circle cx="13" cy="${fillY+4}" r="1.2" fill="#F97316" opacity="0.35"/>
         <circle cx="18" cy="${fillY+7}" r="0.9" fill="#F97316" opacity="0.3"/>`
      : `<path d="M12 14 Q16 19 20 14" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.4"/>
         <circle cx="16" cy="21" r="2" fill="#F97316" opacity="0.15"/>`
    }
  </svg>`;
}

// ── Big glass with fill level 0.0-1.0 ──
function bigGlass(pct) {
  const id = 'bg' + Math.random().toString(36).slice(2);
  const totalH = 18;
  const fillH = totalH * pct;
  const fillY = 28 - fillH;
  return `<svg width="72" height="80" viewBox="0 0 32 32" fill="none">
    <defs><clipPath id="${id}"><rect x="8" y="10" width="16" height="18" rx="3"/></clipPath></defs>
    <rect x="8" y="10" width="16" height="18" rx="3" fill="#FFF3E8" stroke="#F97316" stroke-width="1.5"/>
    <path d="M11 10 L10 6 L22 6 L21 10" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${pct > 0 ? `
      <rect x="8" y="${fillY}" width="16" height="${fillH+2}" fill="#FDBA74" opacity="0.85" clip-path="url(#${id})"/>
      <path d="M10 ${fillY} Q16 ${fillY-2} 22 ${fillY}" stroke="#F97316" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.6"/>
      <circle cx="13" cy="${fillY+4}" r="1.2" fill="#F97316" opacity="0.35"/>
      <circle cx="18" cy="${fillY+6}" r="0.9" fill="#F97316" opacity="0.3"/>
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
    <div class="answer-field">
      <div class="glass-check" onclick="toggleCheck(this)" title="Meine Antwort" data-filled="0">
        ${glassIcon(false)}
      </div>
      <input type="text" placeholder="Antwort ${n}" />
      <button class="del-btn" onclick="delRow(this)" aria-label="Entfernen">
        <i class="ti ti-x"></i>
      </button>
    </div>`;
  return row;
}

// ── Build answer choice (Person B) ──
function makeChoiceRow(text, origI, bSelArr, maxP) {
  const d = document.createElement('div');
  d.className = 'answer-row';
  d.innerHTML = `
    <div class="answer-field">
      <div class="glass-check b-glass" data-filled="0" data-idx="${origI}" title="Antwort wählen">
        ${glassIcon(false)}
      </div>
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

// ── Init ──
function init() {
  const list = document.getElementById('answers-list');
  if (list) {
    list.innerHTML = '';
    for (let i = 1; i <= 4; i++) list.appendChild(makeRow(i));
  }

  const path = window.location.pathname;
  if (path.startsWith('/antworten/')) {
    const id = path.split('/antworten/')[1];
    loadPersonB(id);
  } else if (path.startsWith('/ergebnis/')) {
    const id = path.split('/ergebnis/')[1];
    loadResult(id);
  } else if (path.startsWith('/warten/')) {
    const id = path.split('/warten/')[1];
    sessionId = id;
    const link = `${window.location.origin}/antworten/${id}`;
    document.getElementById('phase-create').style.display = 'none';
    showWaiting(link, id);
  }
}
init();

// ── KI ──
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ question: q, existing })
    });
    const data = await res.json();
    input.value = data.answer || '';
  } catch(e) {
    input.value = '';
  }

  btn.classList.remove('loading');
  btn.innerHTML = '<i class="ti ti-sparkles"></i>';
  input.style.borderColor = '#F97316';
  setTimeout(() => input.style.borderColor = '', 800);
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
    window.location.href = `/warten/${sessionId}`;
  } catch (e) {
    alert('Fehler beim Speichern: ' + e.message);
    btn.innerHTML = '<i class="ti ti-link"></i> Link generieren';
    btn.disabled = false;
  }
}

// ── Waiting screen ──
function showWaiting(link, id) {
  const ad = randomAd();
  document.getElementById('app').innerHTML = `
    ${logoHtml()}
    <div class="waiting-center">
      <div class="waiting-glass">${bigGlass(0.3)}</div>
      <div class="waiting-title">Warte auf die Antwort<br>der anderen Person</div>
      <div class="waiting-sub">Wird in <span id="poll-countdown">15</span>s neu geprüft</div>
      <button class="share-btn" onclick="shareLink('${link}')">
        <i class="ti ti-share"></i> Teilen
      </button>
      <div class="ad-box" style="background:${ad.bg};border-color:${ad.color}20;">
        <div class="ad-label">Anzeige</div>
        <div class="ad-text" style="color:${ad.color}">${ad.text}</div>
        <div class="ad-sub">${ad.sub}</div>
      </div>
      <button class="secondary-btn" onclick="window.open('${window.location.origin}', '_blank')">Neue Frage erstellen</button>
    </div>`;
  startPolling(id);
}

function shareLink(link) {
  if (navigator.share) {
    navigator.share({
      title: 'jooce – Beantworte meine Frage!',
      text: 'Ich habe eine Frage für dich!',
      url: link
    });
  } else {
    navigator.clipboard.writeText(link).then(() => alert('Link kopiert!'));
  }
}

// ── Polling every 15s ──
function startPolling(id) {
  let sec = 15;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    sec--;
    const el = document.getElementById('poll-countdown');
    if (el) el.textContent = sec;
    if (sec <= 0) {
      sec = 15;
      const data = await sbFetch(`sessions?id=eq.${id}&select=picks_b`);
      if (data && data[0] && data[0].picks_b) {
        clearInterval(pollTimer);
        window.location.href = `/ergebnis/${id}`;
      }
    }
  }, 1000);
}

// ── Person B ──
async function loadPersonB(qId) {
  document.getElementById('phase-create').style.display = 'none';
  try {
    const data = await sbFetch(`sessions?id=eq.${qId}&select=*`);
    if (!data || !data[0]) {
      document.getElementById('app').innerHTML = logoHtml() + '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">Link ungültig oder abgelaufen.</div>';
      return;
    }
    const session = data[0];
    if (session.picks_b) { window.location.href = `/ergebnis/${qId}`; return; }

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
      bc.appendChild(makeChoiceRow(a, answers.indexOf(a), bSel, maxPicks));
    });
    document.getElementById('b-send-btn')._bSel = bSel;
    document.getElementById('phase-personb').style.display = 'block';
  } catch (e) { console.error(e); }
}

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
    window.location.href = `/ergebnis/${sessionId}`;
  } catch (e) {
    alert('Fehler: ' + e.message);
    btn.innerHTML = 'Senden';
    btn.disabled = false;
  }
}

// ── Result ──
async function loadResult(id) {
  document.getElementById('phase-create').style.display = 'none';
  try {
    const data = await sbFetch(`sessions?id=eq.${id}&select=*`);
    if (!data || !data[0]) {
      document.getElementById('app').innerHTML = logoHtml() + '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">Ergebnis nicht gefunden.</div>';
      return;
    }
    const session = data[0];
    answers  = session.answers;
    myPicks  = session.picks_a;
    question = session.question;
    showResult(session.picks_b || []);
  } catch(e) { console.error(e); }
}

function showResult(bSel) {
  const matches = myPicks.filter(i => bSel.includes(i));
  const matchCount = matches.length;
  const total = Math.max(myPicks.length, bSel.length);
  const pct = total > 0 ? matchCount / total : 0;

  let matchesHtml = '';
  matches.forEach(i => {
    matchesHtml += `
      <div class="result-match-row fadein">
        <div class="result-glass">${glassIcon(true)}</div>
        <span class="result-match-text">${answers[i]}</span>
      </div>`;
  });

  document.getElementById('app').innerHTML = `
    <div class="result-center">
      ${logoHtml()}
      <div class="result-big-glass">${bigGlass(pct)}</div>
      <div class="result-title">
        ${matchCount === 0 ? 'Kein gemeinsames Match'
          : matchCount === 1 ? '1 gemeinsame Antwort'
          : matchCount + ' gemeinsame Antworten'}
      </div>
      <div class="result-sub">
        ${matchCount === 0 ? 'Ihr habt diesmal nichts Gemeinsames gewählt'
          : pct === 1 ? 'Perfektes Match – ihr denkt genau gleich!'
          : 'Das habt ihr beide gewählt:'}
      </div>
      ${matchesHtml}
      <div class="secret-note" style="margin-top:1.5rem;width:100%;">
        <i class="ti ti-lock" style="font-size:13px;flex-shrink:0;margin-top:1px;color:#F97316"></i>
        Was jeder für sich alleine gewählt hat, bleibt geheim.
      </div>
      <button class="secondary-btn" style="margin-top:1rem;width:100%;"
        onclick="window.open('${window.location.origin}', '_blank')">
        Neue Frage erstellen
      </button>
    </div>`;
}

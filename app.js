// ── Config – trage hier deine eigenen Werte ein ──
const SUPABASE_URL = "https://rhthtidolapnfrmmsojs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJodGh0aWRvbGFwbmZybW1zb2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTE3OTAsImV4cCI6MjA5NTk4Nzc5MH0.YT8qp6ierdW4DoiquaSf-DkEU_wJjEtsWVp66SngZec";

let maxPicks = 1, myPicks = [], answers = [], question = '';
let pollTimer = null, sessionId = null;

const ADS = [
  { text: "Deine Werbung hier", sub: "werbung@jooce.app", color: "#F97316" },
  { text: "jooce Premium", sub: "Noch mehr Spass mit jooce Pro", color: "#8B5CF6" },
  { text: "Advertise with us", sub: "reach@jooce.app", color: "#3B82F6" },
];

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

function makeId() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function logoHtml() {
  return `<div class="logo">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="8" y="10" width="16" height="18" rx="3" fill="#FFF7ED" stroke="#F97316" stroke-width="1.5"/>
      <path d="M11 10 L10 6 L22 6 L21 10" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M12 14 Q16 19 20 14" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <circle cx="16" cy="21" r="2" fill="#F97316" opacity="0.5"/>
    </svg>
    <span class="logo-text">jooce<em>.</em></span>
  </div>`;
}

function checkCircle(checked) {
  return `<div class="check-circle${checked ? ' checked' : ''}">
    ${checked ? '<i class="ti ti-check" aria-hidden="true"></i>' : ''}
  </div>`;
}

function bigGlass(pct) {
  const id = 'bg' + Math.random().toString(36).slice(2);
  const fillH = 18 * pct;
  const fillY = 28 - fillH;
  return `<svg width="80" height="90" viewBox="0 0 32 32" fill="none">
    <defs><clipPath id="${id}"><rect x="8" y="10" width="16" height="18" rx="3"/></clipPath></defs>
    <rect x="8" y="10" width="16" height="18" rx="3" fill="#FFF7ED" stroke="#F97316" stroke-width="1.5"/>
    <path d="M11 10 L10 6 L22 6 L21 10" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${pct > 0 ? `
      <rect x="8" y="${fillY}" width="16" height="${fillH + 1}" fill="#FDBA74" opacity="0.9" clip-path="url(#${id})"/>
      <path d="M10 ${fillY} Q16 ${fillY - 2} 22 ${fillY}" stroke="#F97316" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.6"/>
      <circle cx="13" cy="${Math.min(fillY + 4, 27)}" r="1.2" fill="#F97316" opacity="0.35"/>
      <circle cx="18" cy="${Math.min(fillY + 7, 27)}" r="0.9" fill="#F97316" opacity="0.3"/>
    ` : `
      <path d="M12 14 Q16 19 20 14" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.4"/>
      <circle cx="16" cy="21" r="2" fill="#F97316" opacity="0.15"/>
    `}
  </svg>`;
}

// Answer row: [check] [input field] [KI btn]
function makeRow(n) {
  const row = document.createElement('div');
  row.className = 'answer-row';
  row.innerHTML = `
    <div class="check-wrap" onclick="toggleCheck(this)" title="Meine Antwort" data-filled="0">
      ${checkCircle(false)}
    </div>
    <div class="answer-field">
      <input type="text" placeholder="Antwort ${n}" />
      <button class="del-btn" onclick="delRow(this)" aria-label="Entfernen">
        <i class="ti ti-x"></i>
      </button>
    </div>
    <button class="ai-btn" onclick="genOne(this)" title="KI generiert diese Antwort">
      <i class="ti ti-sparkles" aria-hidden="true"></i>
    </button>`;
  return row;
}

// Person B row: [check] [input field]
function makeChoiceRow(text, origI, bSelArr, maxP) {
  const d = document.createElement('div');
  d.className = 'answer-row';
  d.innerHTML = `
    <div class="check-wrap b-check" data-filled="0" data-idx="${origI}" title="Antwort wählen">
      ${checkCircle(false)}
    </div>
    <div class="answer-field">
      <input type="text" value="${text}" disabled style="cursor:default;" />
    </div>`;
  d.querySelector('.b-check').onclick = function() {
    const filled = this.dataset.filled === '1';
    if (filled) {
      this.dataset.filled = '0';
      this.innerHTML = checkCircle(false);
      const i = bSelArr.indexOf(origI);
      if (i > -1) bSelArr.splice(i, 1);
    } else {
      if (bSelArr.length >= maxP) {
        const oldIdx = bSelArr.shift();
        const oldEl = document.querySelector(`.b-check[data-idx="${oldIdx}"]`);
        if (oldEl) { oldEl.dataset.filled = '0'; oldEl.innerHTML = checkCircle(false); }
      }
      this.dataset.filled = '1';
      this.innerHTML = checkCircle(true);
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
  const path = window.location.pathname;
  if (path.startsWith('/antworten/')) loadPersonB(path.split('/antworten/')[1]);
  else if (path.startsWith('/ergebnis/')) loadResult(path.split('/ergebnis/')[1]);
  else if (path.startsWith('/warten/')) {
    const id = path.split('/warten/')[1];
    sessionId = id;
    document.getElementById('phase-create').style.display = 'none';
    showWaiting(`${window.location.origin}/antworten/${id}`, id);
  }
}
init();

async function genOne(btn) {
  const row = btn.parentElement;
  const input = row.querySelector('input');
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinning" style="font-size:14px">↻</span>';
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
  } catch(e) { input.value = ''; }
  btn.classList.remove('loading');
  btn.innerHTML = '<i class="ti ti-sparkles" aria-hidden="true"></i>';
  input.style.borderColor = '#F97316';
  setTimeout(() => input.style.borderColor = '', 800);
}

function toggleCheck(el) {
  const rows = Array.from(document.getElementById('answers-list').querySelectorAll('.answer-row'));
  const idx  = rows.indexOf(el.closest('.answer-row'));
  const filled = el.dataset.filled === '1';
  if (filled) {
    el.dataset.filled = '0'; el.innerHTML = checkCircle(false);
    myPicks = myPicks.filter(x => x !== idx);
  } else {
    if (myPicks.length >= maxPicks) {
      const old = myPicks.shift();
      const oldEl = rows[old].querySelector('.check-wrap');
      oldEl.dataset.filled = '0'; oldEl.innerHTML = checkCircle(false);
    }
    el.dataset.filled = '1'; el.innerHTML = checkCircle(true);
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
      method: 'POST', prefer: 'return=minimal',
      body: JSON.stringify({ id: sessionId, question, answers, picks_a: myPicks, max_picks: maxPicks })
    });
    window.location.href = `/warten/${sessionId}`;
  } catch(e) {
    alert('Fehler: ' + e.message);
    btn.innerHTML = '<i class="ti ti-link"></i> Link generieren';
    btn.disabled = false;
  }
}

function showWaiting(link, id) {
  const ad = ADS[Math.floor(Math.random() * ADS.length)];
  document.getElementById('app').innerHTML = `
    ${logoHtml()}
    <div class="waiting-center">
      <div class="waiting-glass">${bigGlass(0.3)}</div>
      <div class="waiting-title">Warte auf die Antwort<br>der anderen Person</div>
      <div class="waiting-sub">Wird in <span id="poll-countdown">15</span>s neu geprüft</div>
      <button class="share-btn" onclick="shareLink('${link}')">
        <i class="ti ti-share" aria-hidden="true"></i> Teilen
      </button>
      <div class="ad-box">
        <div class="ad-label">Anzeige</div>
        <div class="ad-text" style="color:${ad.color}">${ad.text}</div>
        <div class="ad-sub">${ad.sub}</div>
      </div>
      <button class="secondary-btn" onclick="window.open('${window.location.origin}', '_blank')">
        <i class="ti ti-plus" aria-hidden="true"></i> Neue Frage erstellen
      </button>
    </div>`;
  startPolling(id);
}

function shareLink(link) {
  if (navigator.share) {
    navigator.share({ title: 'jooce – Beantworte meine Frage!', text: 'Ich habe eine Frage für dich!', url: link });
  } else {
    navigator.clipboard.writeText(link).then(() => alert('Link kopiert!'));
  }
}

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

async function loadPersonB(qId) {
  document.getElementById('phase-create').style.display = 'none';
  try {
    const data = await sbFetch(`sessions?id=eq.${qId}&select=*`);
    if (!data || !data[0]) {
      document.getElementById('app').innerHTML = logoHtml() + '<div style="text-align:center;padding:2rem;color:#6B7280;">Link ungültig oder abgelaufen.</div>';
      return;
    }
    const session = data[0];
    if (session.picks_b) { window.location.href = `/ergebnis/${qId}`; return; }
    sessionId = qId; answers = session.answers; myPicks = session.picks_a;
    maxPicks = session.max_picks; question = session.question;
    document.getElementById('q-display-b').textContent = question;
    document.getElementById('q-meta-b').textContent = `Wähle bis zu ${maxPicks} Antwort${maxPicks > 1 ? 'en' : ''}`;
    const shuffled = [...answers].sort(() => Math.random() - 0.5);
    let bSel = [];
    const bc = document.getElementById('b-choices');
    bc.innerHTML = '';
    shuffled.forEach(a => bc.appendChild(makeChoiceRow(a, answers.indexOf(a), bSel, maxPicks)));
    document.getElementById('b-send-btn')._bSel = bSel;
    document.getElementById('phase-personb').style.display = 'block';
  } catch(e) { console.error(e); }
}

async function submitB() {
  const bSel = document.getElementById('b-send-btn')._bSel || [];
  if (!bSel.length) { alert('Bitte wähle mindestens eine Antwort!'); return; }
  const btn = document.getElementById('b-send-btn');
  btn.innerHTML = '<span class="spinning">↻</span> Wird gespeichert...';
  btn.disabled = true;
  try {
    await sbFetch(`sessions?id=eq.${sessionId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify({ picks_b: bSel })
    });
    window.location.href = `/ergebnis/${sessionId}`;
  } catch(e) {
    alert('Fehler: ' + e.message);
    btn.innerHTML = 'Senden'; btn.disabled = false;
  }
}

async function loadResult(id) {
  document.getElementById('phase-create').style.display = 'none';
  try {
    const data = await sbFetch(`sessions?id=eq.${id}&select=*`);
    if (!data || !data[0]) {
      document.getElementById('app').innerHTML = logoHtml() + '<div style="text-align:center;padding:2rem;color:#6B7280;">Ergebnis nicht gefunden.</div>';
      return;
    }
    const s = data[0];
    answers = s.answers; myPicks = s.picks_a; question = s.question;
    showResult(s.picks_b || []);
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
        ${checkCircle(true)}
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
        <i class="ti ti-lock" style="font-size:14px;flex-shrink:0;margin-top:1px;color:#F97316" aria-hidden="true"></i>
        Was jeder für sich alleine gewählt hat, bleibt geheim.
      </div>
      <button class="secondary-btn" style="margin-top:1rem;width:100%;"
        onclick="window.open('${window.location.origin}', '_blank')">
        <i class="ti ti-plus" aria-hidden="true"></i> Neue Frage erstellen
      </button>
    </div>`;
}

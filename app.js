// ── State ──
let maxPicks = 1, myPicks = [], answers = [], question = '';
let countdownTimer = null, countdownSec = 30;

// ── Answer pools for KI simulation ──
const pools = {
  s_machen: ['Kino', 'Zuhause', 'Spazieren', 'Freunde treffen', 'Sport', 'Restaurant', 'Kochen', 'Konzert'],
  l_machen: ['Ich würde gerne ins Kino gehen', 'Lieber zu Hause bleiben', 'Einen Spaziergang machen', 'Freunde treffen', 'Sport machen', 'In ein Restaurant gehen'],
  s_essen:  ['Pizza', 'Sushi', 'Pasta', 'Burger', 'Salat', 'Thai', 'Ramen', 'Döner'],
  l_essen:  ['Ich hätte Lust auf Pizza', 'Sushi wäre perfekt', 'Pasta geht immer', 'Ein saftiger Burger'],
  def:      ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'],
};

function detectPool() {
  const q = document.getElementById('q-input').value.toLowerCase();
  const vals = Array.from(document.getElementById('answers-list').querySelectorAll('input'))
    .map(i => i.value.trim()).filter(Boolean);
  const long = vals.some(v => v.split(' ').length > 3);
  if (q.match(/machen|heute|abend|wochenende|plan/)) return long ? pools.l_machen : pools.s_machen;
  if (q.match(/essen|food|hunger|kochen|resto/))     return long ? pools.l_essen  : pools.s_essen;
  return pools.def;
}

// ── Glass SVG icon ──
function glassIcon(filled) {
  const id = 'gc' + Math.random().toString(36).slice(2);
  return `<svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="${id}"><rect x="2" y="4" width="18" height="19" rx="2"/></clipPath></defs>
    <rect x="2" y="4" width="18" height="19" rx="2"
      fill="${filled ? '#FFF3E8' : '#fff'}" stroke="#F97316" stroke-width="1.3"/>
    <path d="M4.5 4 L3.5 1 L18.5 1 L17.5 4"
      stroke="#F97316" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${filled
      ? `<rect x="2" y="13" width="18" height="10" fill="#FDBA74" opacity="0.85" clip-path="url(#${id})"/>
         <path d="M4 13 Q11 10 18 13" stroke="#F97316" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.6"/>
         <circle cx="8"  cy="17" r="1.2" fill="#F97316" opacity="0.35"/>
         <circle cx="13" cy="19" r="0.9" fill="#F97316" opacity="0.3"/>`
      : `<path d="M6 13 Q11 17 16 13" stroke="#F97316" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.4"/>`
    }
  </svg>`;
}

// ── Build an answer row ──
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

function init() {
  const list = document.getElementById('answers-list');
  list.innerHTML = '';
  for (let i = 1; i <= 4; i++) list.appendChild(makeRow(i));
}
init();

// ── KI generate single answer ──
function genOne(btn) {
  const row   = btn.parentElement;
  const input = row.querySelector('input');
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinning" style="font-size:13px">↻</span>';
  setTimeout(() => {
    const pool  = detectPool();
    const used  = Array.from(document.getElementById('answers-list').querySelectorAll('input'))
                    .map(i => i.value.trim()).filter(Boolean);
    const avail = pool.filter(p => !used.includes(p));
    input.value = (avail.length ? avail : pool)[Math.floor(Math.random() * (avail.length || pool.length))];
    btn.classList.remove('loading');
    btn.innerHTML = '<i class="ti ti-sparkles"></i>';
    input.style.borderColor = '#F97316';
    setTimeout(() => input.style.borderColor = '', 800);
  }, 500 + Math.random() * 400);
}

// ── Toggle glass check ──
function toggleCheck(el) {
  const rows   = Array.from(document.getElementById('answers-list').querySelectorAll('.answer-row'));
  const idx    = rows.indexOf(el.closest('.answer-row'));
  const filled = el.dataset.filled === '1';
  if (filled) {
    el.dataset.filled = '0';
    el.innerHTML = glassIcon(false);
    myPicks = myPicks.filter(x => x !== idx);
  } else {
    if (myPicks.length >= maxPicks) {
      const old   = myPicks.shift();
      const oldEl = rows[old].querySelector('.glass-check');
      oldEl.dataset.filled = '0';
      oldEl.innerHTML = glassIcon(false);
    }
    el.dataset.filled = '1';
    el.innerHTML = glassIcon(true);
    myPicks.push(idx);
  }
}

// ── Count +/- ──
function chgCount(d) {
  const n = document.getElementById('answers-list').querySelectorAll('.answer-row').length;
  maxPicks = Math.max(1, Math.min(n, maxPicks + d));
  document.getElementById('count-num').textContent = maxPicks;
}

// ── Add / delete rows ──
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
function generateLink() {
  question = document.getElementById('q-input').value.trim() || 'Was möchtest du heute machen?';
  const rows = Array.from(document.getElementById('answers-list').querySelectorAll('.answer-row'));
  answers = rows.map(r => r.querySelector('input').value.trim()).filter(Boolean);
  if (!answers.length) answers = ['Kino', 'Restaurant', 'Zuhause', 'Spazieren'];
  if (!myPicks.length) { alert('Bitte wähle mindestens eine Antwort!'); return; }

  // Lock inputs
  document.getElementById('answers-list').querySelectorAll('input').forEach(i => i.disabled = true);
  document.getElementById('answers-list').querySelectorAll('.ai-btn,.del-btn,.glass-check')
    .forEach(b => b.style.pointerEvents = 'none');
  document.querySelector('.add-row').style.display   = 'none';
  document.querySelector('.info-box').style.display  = 'none';
  document.getElementById('gen-link-btn').style.display = 'none';

  document.getElementById('link-display').textContent = 'jooce.app/q/x7k2p9';
  document.getElementById('phase-waiting').style.display = 'block';
  startCountdown();
}

function startCountdown() {
  countdownSec = 30;
  document.getElementById('countdown').textContent = '30s';
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdownSec--;
    document.getElementById('countdown').textContent = countdownSec + 's';
    if (countdownSec <= 0) countdownSec = 30;
  }, 1000);
}

function copyLink() {
  const btn = document.querySelector('.copy-btn');
  btn.innerHTML = '<i class="ti ti-check"></i> Kopiert!';
  setTimeout(() => btn.innerHTML = '<i class="ti ti-copy"></i> Kopieren', 2000);
}

// ── Simulate Person B ──
function simPersonB() {
  const shuffled = [...answers].sort(() => Math.random() - 0.5);
  document.getElementById('q-display-b').textContent = question;
  document.getElementById('q-meta-b').textContent    = `Wähle bis zu ${maxPicks} Antwort${maxPicks > 1 ? 'en' : ''}`;
  let bSel = [];
  const bc = document.getElementById('b-choices');
  bc.innerHTML = '';
  shuffled.forEach(a => {
    const origI = answers.indexOf(a);
    const d = document.createElement('div');
    d.className = 'answer-choice';
    d.innerHTML = `<i class="ti ti-circle" style="font-size:18px;color:#F97316"></i> ${a}`;
    d.onclick = () => {
      if (d.classList.contains('selected')) {
        d.classList.remove('selected');
        d.querySelector('i').className = 'ti ti-circle';
        bSel = bSel.filter(x => x !== origI);
      } else if (bSel.length < maxPicks) {
        d.classList.add('selected');
        d.querySelector('i').className = 'ti ti-circle-check';
        bSel.push(origI);
      }
      document.getElementById('b-send-btn')._bSel = bSel;
    };
    bc.appendChild(d);
  });
  document.getElementById('b-send-btn')._bSel = bSel;
  document.getElementById('phase-personb').style.display = 'block';
  document.getElementById('phase-personb').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Submit Person B ──
function submitB() {
  const bSel = document.getElementById('b-send-btn')._bSel || [];
  if (!bSel.length) { alert('Bitte wähle mindestens eine Antwort!'); return; }
  if (countdownTimer) clearInterval(countdownTimer);

  const matches = myPicks.filter(i => bSel.includes(i));
  document.getElementById('q-display-result').textContent = question;

  const mb = document.getElementById('match-banner');
  if (matches.length === 0) {
    document.getElementById('match-title').textContent = 'Kein gemeinsames Match';
    document.getElementById('match-sub').textContent   = 'Ihr habt diesmal nichts Gemeinsames gewählt';
    mb.style.background   = '#F9FAFB';
    mb.style.borderColor  = '#E5E7EB';
    document.getElementById('match-title').style.color = '#111827';
  } else {
    const perfect = matches.length === Math.max(myPicks.length, bSel.length);
    document.getElementById('match-title').textContent = perfect
      ? '🎉 Perfektes Match!'
      : matches.length === 1 ? '1 gemeinsame Antwort' : `${matches.length} gemeinsame Antworten`;
    document.getElementById('match-sub').textContent = perfect
      ? 'Ihr denkt genau gleich!' : 'Das habt ihr beide gewählt';
  }

  const rc = document.getElementById('result-choices');
  rc.innerHTML = '';
  answers.forEach((a, i) => {
    const isMatch = matches.includes(i);
    const d = document.createElement('div');
    d.className = 'answer-choice disabled fadein' + (isMatch ? ' match' : ' no-match');
    d.innerHTML = isMatch
      ? `<i class="ti ti-circle-check" style="font-size:18px;color:#16A34A"></i> ${a}`
      : `<i class="ti ti-circle"       style="font-size:18px;color:#9CA3AF"></i> ${a}`;
    rc.appendChild(d);
  });

  document.getElementById('phase-result').style.display = 'block';
  document.getElementById('phase-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Reset ──
function resetAll() {
  myPicks = []; answers = []; question = ''; maxPicks = 1;
  if (countdownTimer) clearInterval(countdownTimer);
  document.getElementById('count-num').textContent   = '1';
  document.getElementById('q-input').value           = '';
  init();
  document.querySelector('.add-row').style.display   = '';
  document.querySelector('.info-box').style.display  = '';
  document.getElementById('gen-link-btn').style.display  = '';
  document.getElementById('phase-waiting').style.display = 'none';
  document.getElementById('phase-personb').style.display = 'none';
  document.getElementById('phase-result').style.display  = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

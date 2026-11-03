/* Secure Reader clone - classic script (no module dependency for UI state) */
const API = 'https://books.streamfiles.eu.org/api';
const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const DEFAULT_CHAPTER_ID = '699c11b428569e839bf7e7d9';
const KEY = [90, 165, 195, 60, 15, 240, 150, 105];

const $ = (id) => document.getElementById(id);
window.__APPBOOT='appjs-ok'; if (typeof setBoot==='function') setBoot('appjs-ok');
const params = new URLSearchParams(location.search);

function show(id){ $(id).classList.remove('hidden'); }
function hide(id){ $(id).classList.add('hidden'); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

window.addEventListener('error', (e) => {
  const box = $('errBox');
  if (box && params.get('ref')) { $('errMsg').textContent = 'Error: ' + (e.message || 'unknown'); show('errBox'); hide('loader'); }
});

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const decrypt = (u8) => { const out = new Uint8Array(u8.length); for (let i = 0; i < u8.length; i++) out[i] = u8[i] ^ KEY[i % 8] ^ (i % 256); return out; };

let pdfjsLib = null;
async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import(PDFJS_URL);
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  }
  return pdfjsLib;
}

const R = { ref: '', pages: 0, title: '', cur: 0, zoom: 1, cache: new Map(), busy: false };

function openReader() {
try {
  if (params.get('ref')) { if(typeof setBoot==='function') setBoot('route:reader'); openReader(); }
  else { if(typeof setBoot==='function') setBoot('route:home'); initHome(); }
} catch (e) {
  if (params.get('ref')) { $('errMsg').textContent = 'Boot error: ' + e.message; show('errBox'); }
}

/* ================= HOME ================= */
async function initHome() {
  const bookId = params.get('book') || DEFAULT_CHAPTER_ID;
  let book = null;
  try {
    const r = await fetch(`${API}/books.php?book_chapters=${encodeURIComponent(bookId)}`);
    const j = await r.json();
    if (j.success && j.data) book = j.data;
  } catch (_) {}
  if (!book) { $('chapterGrid').innerHTML = '<div class="chap">Book list load nahi hui. Reload karke dekho.</div>'; return; }

  const cover = book.coverImage && (book.coverImage.fullUrl || (book.coverImage.baseUrl ? book.coverImage.baseUrl + book.coverImage.key : ''));
  const hero = $('heroCard');
  hero.innerHTML = '';
  if (cover) { const img = new Image(); img.src = cover; img.className = 'hero-cover'; img.loading = 'lazy'; hero.appendChild(img); }
  const info = document.createElement('div');
  info.className = 'hero-info';
  const badges = [
    book.displayClass ? `<span class="badge">${escapeHtml(book.displayClass)}</span>` : '',
    (book.exams && book.exams.length) ? `<span class="badge">${escapeHtml(book.exams.join(', '))}</span>` : '',
    book.edition ? `<span class="badge">${escapeHtml(book.edition)}</span>` : '',
  ].join('');
  info.innerHTML = `
    <div class="hero-title">${escapeHtml(book.title || 'Digital Module')}</div>
    <div class="hero-sub">${escapeHtml(book.subTitle || book.author || '')} · ${book.noOfChapters || (book.chapterDetails || []).length} chapters</div>
    <div class="hero-badges">${badges}</div>`;
  hero.appendChild(info);

  const chaps = (book.chapterDetails || []).filter((c) => c.status === 'ACTIVE');
  chaps.sort((a, b) => (parseInt(a.displayChapterNumber) || 0) - (parseInt(b.displayChapterNumber) || 0));
  $('chapterCount').textContent = `${chaps.length} chapters`;
  $('chapterGrid').innerHTML = '';
  chaps.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'chap';
    card.innerHTML = `
      <div class="chap-num">${escapeHtml(String(c.displayChapterNumber || i + 1))}</div>
      <div class="chap-title">${escapeHtml(c.title || 'Chapter')}</div>
      <div class="chap-meta">${c.totalPageCount ? c.totalPageCount + ' pages' : ''}</div>`;
    card.onclick = () => {
      const q = new URLSearchParams({ ref: c.encryptedQuery || '', pages: c.totalPageCount || '', title: c.title || 'Chapter' });
      location.href = '?' + q.toString();
    };
    $('chapterGrid').appendChild(card);
  });
}

/* ================= READER ================= */
function openReader() {
  $('homeView').classList.add('hidden');
  $('readerView').classList.remove('hidden');
  R.ref = params.get('ref') || '';
  R.title = params.get('title') || 'Secure Reader';
  R.pages = parseInt(params.get('pages')) || 0;
  $('readerTitle').textContent = R.title;

  if (R.pages) goTo(1); else fetchCount();
  fetch(`${API}/page_count.php?asset_ref=${encodeURIComponent(R.ref)}`)
    .then((r) => r.json())
    .then((j) => { if (j.success && j.pages) { R.pages = j.pages; if (R.cur) setChrome(R.cur); else goTo(1); } })
    .catch(() => {});

  $('backBtn').onclick = () => { location.href = './'; };
  $('prevBtn').onclick = () => goTo(R.cur - 1);
  $('nextBtn').onclick = () => goTo(R.cur + 1);
  $('zoomIn').onclick = () => { R.zoom = Math.min(2, R.zoom + 0.15); if (R.cur) goTo(R.cur); };
  $('zoomOut').onclick = () => { R.zoom = Math.max(0.6, R.zoom - 0.15); if (R.cur) goTo(R.cur); };
  $('zoomFit').onclick = () => { R.zoom = 1; if (R.cur) goTo(R.cur); };
  $('retryBtn').onclick = () => { hide('errBox'); if (R.cur) goTo(R.cur); };
  $('jumpInput').onkeydown = (e) => {
    if (e.key === 'Enter') {
      const n = parseInt($('jumpInput').value);
      if (n >= 1 && n <= R.pages) { goTo(n); $('jumpInput').blur(); }
    }
  };
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') goTo(R.cur + 1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(R.cur - 1);
  });
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!R.busy && R.cur) goTo(R.cur); }, 200); });
}

function setChrome(n) {
  $('pageInd').textContent = `${n} / ${R.pages || '–'}`;
  $('progressFill').style.width = R.pages ? `${(n / R.pages) * 100}%` : '0%';
}

async function goTo(n) {
  if (!R.pages || n < 1 || n > R.pages || R.busy) return;
  R.busy = true;
  R.cur = n;
  setChrome(n);
  $('jumpInput').value = n;
  show('loader'); hide('errBox');
  try {
    const lib = await getPdfJs();
    const bytes = await getPageBytes(n);
    const doc = await lib.getDocument({ data: bytes, isEvalSupported: false }).promise;
    const page1 = await doc.getPage(1);
    const vp1 = page1.getViewport({ scale: 1 });
    const avail = Math.min($('readerStage').clientWidth - 24, 860);
    const scale = (avail / vp1.width) * R.zoom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vp = page1.getViewport({ scale: scale * dpr });
    const canvas = $('pageCanvas');
    canvas.width = vp.width; canvas.height = vp.height;
    canvas.style.width = `${avail * R.zoom}px`;
    $('pageWrap').style.width = `${avail * R.zoom}px`;
    await page1.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    hide('loader');
    if (n + 1 <= R.pages) getPageBytes(n + 1).catch(() => {});
    if (n + 2 <= R.pages) getPageBytes(n + 2).catch(() => {});
  } catch (err) {
    hide('loader'); show('errBox');
    $('errMsg').textContent = (err && err.message) || 'Unknown error';
  }
  R.busy = false;
}

function getPageBytes(n) {
  if (R.cache.has(n)) return R.cache.get(n);
  const p = (async () => {
    const r = await fetch(`${API}/page.php?asset_ref=${encodeURIComponent(R.ref)}&page=${n}`);
    const j = await r.json();
    if (!j.success || !j.data) throw new Error(j.error || 'Failed to load page');
    return decrypt(b64ToBytes(j.data));
  })();
  R.cache.set(n, p);
  p.catch(() => R.cache.delete(n));
  return p;
}

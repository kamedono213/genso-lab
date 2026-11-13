'use strict';
// 勉強アプリ共通: 「もどる」確認スニペット。app.js の 'use strict' 直後に貼り、ROUTED をアプリに合わせる
// 「もどる」「やめる」を押したら、本当にもどるか確かめる(スマホの「戻る」操作も)。
// 画面のボタンは id="back" / id="quit"。もともと確認があるボタンは data-noconfirm をつけて除く
(() => {
  let bypass = false, ignorePop = false;
  const pass = fn => { bypass = true; fn(); setTimeout(() => { bypass = false; }, 500); };
  const ask = onYes => {
    if (document.getElementById('leave-confirm')) return;
    const d = document.createElement('div');
    d.id = 'leave-confirm'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:grid;place-items:center;padding:16px';
    d.innerHTML = '<div style="background:#fff;color:#222;border-radius:16px;padding:20px 18px;max-width:320px;width:100%;display:grid;gap:14px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25)">'
      + '<b style="font-size:18px">本当にもどりますか？</b><span style="font-size:14px;color:#555">いまの続きは消えることがあります。</span>'
      + '<div style="display:flex;gap:10px"><button type="button" data-a="no" style="flex:1;padding:12px;border-radius:12px;border:1px solid #ccc;background:#fff;color:#222;font:inherit;font-weight:700">つづける</button>'
      + '<button type="button" data-a="yes" style="flex:1;padding:12px;border-radius:12px;border:0;background:#2f6fd0;color:#fff;font:inherit;font-weight:700">もどる</button></div></div>';
    d.addEventListener('click', e => {
      const a = e.target.closest('[data-a]');
      if (!a && e.target !== d) return;
      d.remove();
      if (a && a.dataset.a === 'yes') onYes();
    });
    document.body.appendChild(d);
    d.querySelector('[data-a="no"]').focus();
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('#back, #quit');
    if (!b || bypass || b.hasAttribute('data-noconfirm')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    ask(() => pass(() => b.click()));
  }, true);
  // ROUTED: このアプリが画面ごとに履歴を積むか。積まないアプリは、戻る操作を受け止める「しおり」を1つ積んでおく
  const ROUTED = false; // 画面ごとに history.pushState するアプリは true
  const guard = () => history.pushState({ leaveGuard: 1 }, '');
  if (!ROUTED) guard();
  window.addEventListener('popstate', e => {
    if (ignorePop) { ignorePop = false; e.stopImmediatePropagation(); return; }
    if (bypass) return;
    e.stopImmediatePropagation();
    if (!ROUTED) {
      const b = document.querySelector('#back, #quit');
      if (!b) { history.back(); return; }                 // メニュー画面ではそのままアプリを閉じる
      guard();
      if (b.hasAttribute('data-noconfirm')) { b.click(); return; }
      ask(() => pass(() => b.click()));
      return;
    }
    ignorePop = true; history.go(1); // いったん元の画面にとどまる
    ask(() => pass(() => history.back()));
  }, true);
})();

// ---------- ふりがな(ちりパズルと同じく、漢字の上に小さく読みを出す)
// 辞書 window.FURI は furi.js(onze.ltd/tools/furigana/make-furi.js が自動生成)。
// 画面に出た文字を自動で包むので、各画面のコードは変えなくてよい。答え合わせに使う textContent は変わらない(読みは CSS で表示)。
// 切りかえボタンは、data-furi-slot を付けた場所に自動で入る。設定はアプリごとに保存
(() => {
  const D = window.FURI || {};
  // 先頭の1文字ごとに、長い順に並べておく(文まるごと → 単語の順に当てはめる)
  const byHead = {};
  Object.keys(D).sort((a, b) => b.length - a.length).forEach(k => (byHead[k[0]] = byHead[k[0]] || []).push(k));
  const KEY = 'furi:' + location.pathname;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* 保存できなくても動く */ }
  const css = document.createElement('style');
  // アプリ側の「span に〜」という指定が効かないように、ルビの span は !important で固める
  css.textContent = '.rbw,.rb{margin:0!important;border:0!important;background:none!important;min-width:0!important;font:inherit!important;color:inherit!important;letter-spacing:inherit!important;text-indent:0!important}'
    + '.rbw{display:inline!important;padding:0!important}'
    + '.rb{display:inline-block!important;position:relative!important;padding:0!important}'
    // ふりがなありの時は行の高さを広げ、読みは行間(漢字の上のすき間)に置く。行ごとに高さがばらつかない
    + 'html.furi body{line-height:2.2}'
    + 'html.furi .rb{line-height:max(2.2em, 1em + 17px)!important}'
    + 'html.furi .rb::before{content:attr(data-rt);position:absolute;bottom:calc(50% + 1.02em);left:50%;transform:translateX(-50%);font-size:max(.5em,7.5px);font-weight:700;line-height:1.1;white-space:nowrap;letter-spacing:0;pointer-events:none}'
    + '.furi-tools{display:inline-flex;flex-wrap:wrap;gap:6px;justify-self:start;align-self:center;width:auto;flex:none;line-height:1.4}'
    + '.furi-toggle{width:auto;flex:none;line-height:1.4;border:1.5px solid rgba(127,127,127,.4);background:transparent;color:inherit;border-radius:999px;padding:4px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}'
    + '.furi-toggle[aria-pressed="true"]{border-color:currentColor}';
  document.head.appendChild(css);
  const apply = () => document.documentElement.classList.toggle('furi', on);
  apply();
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'TITLE']);
  const ok = el => {
    for (let e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (e.namespaceURI === 'http://www.w3.org/2000/svg') return false;
      if (e.classList.contains('rb') || e.classList.contains('rbw') || e.hasAttribute('data-nofuri')) return false;
      if (e.lang && !/^ja/i.test(e.lang)) return false; // 外国語の文字(中国語の漢字など)には付けない
      if (SKIP.has(e.tagName)) return false;
    }
    return true;
  };
  function wrapText(node) {
    const t = node.nodeValue;
    if (!/[一-鿿々]/.test(t)) return;
    const frag = document.createDocumentFragment();
    let last = 0, hit = false;
    for (let i = 0; i < t.length;) {
      const k = (byHead[t[i]] || []).find(x => t.startsWith(x, i));
      if (!k) { i++; continue; }
      hit = true;
      if (i > last) frag.appendChild(document.createTextNode(t.slice(last, i)));
      for (const seg of D[k]) {
        if (typeof seg === 'string') { frag.appendChild(document.createTextNode(seg)); continue; }
        const s = document.createElement('span'); s.className = 'rb'; s.dataset.rt = seg[1]; s.textContent = seg[0];
        frag.appendChild(s);
      }
      i = last = i + k.length;
    }
    if (!hit) return;
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    // 1つの span にまとめて入れる(flex や grid の中で、ルビごとに改行されないように)
    const w = document.createElement('span'); w.className = 'rbw'; w.appendChild(frag);
    node.replaceWith(w);
  }
  // 切りかえボタンを入れる箱(効果音ボタンもここに入る)
  function tools(slot) {
    let box = slot.querySelector(':scope > .furi-tools');
    if (!box) { box = document.createElement('span'); box.className = 'furi-tools'; box.setAttribute('data-nofuri', ''); slot.appendChild(box); }
    return box;
  }
  function toggleHtml() { return `<button type="button" class="furi-toggle" data-furi-toggle aria-pressed="${on}">ふりがな ${on ? 'あり' : 'なし'}</button>`; }
  function scan(root) {
    if (root.nodeType === 3) { if (ok(root.parentNode)) wrapText(root); return; }
    if (root.nodeType !== 1 || !ok(root)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    let n; while ((n = w.nextNode())) if (ok(n.parentNode)) list.push(n);
    list.forEach(wrapText);
    const slots = root.querySelectorAll ? [...root.querySelectorAll('[data-furi-slot]')] : [];
    if (root.hasAttribute && root.hasAttribute('data-furi-slot')) slots.push(root);
    slots.forEach(s => { if (!s.querySelector('[data-furi-toggle]')) tools(s).insertAdjacentHTML('afterbegin', toggleHtml()); });
  }
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) scan(n); })
    .observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-furi-toggle]'); if (!b) return;
    on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (err) { /* 保存できなくても切りかわる */ }
    apply();
    document.querySelectorAll('[data-furi-toggle]').forEach(x => { x.setAttribute('aria-pressed', on); x.textContent = 'ふりがな ' + (on ? 'あり' : 'なし'); });
  });
  window.furiTools = tools;
  if (document.body) scan(document.body);
})();

// ---------- 効果音(Web Audio で合成。音声ファイルは使わない)
// SE.play('ok') のように呼ぶ。音の名前: start / select / ok / ng / star / result / perfect / land / clear / over
// SE.chain(n) は連鎖の n 段目(段ごとに高くなる)。
// 「音あり/なし」ボタンは data-furi-slot の場所に自動で入る(ふりがなボタンのとなり)。設定はアプリごとに保存
const SE = (() => {
  const KEY = 'se-muted:' + location.pathname;
  let muted = false, ctx = null;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* 保存できなくても動く */ }
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // 1音: 周波数・開始(秒)・長さ・波形・音量・(最後の周波数)
  function tone(freq, at, dur, type = 'sine', vol = 0.18, slideTo = null) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const SOUNDS = {
    start: () => { tone(523, 0, 0.09, 'triangle'); tone(784, 0.08, 0.14, 'triangle'); },
    select: () => tone(660, 0, 0.06, 'triangle', 0.12),
    ok: () => { tone(880, 0, 0.12, 'sine', 0.2); tone(1319, 0.1, 0.28, 'sine', 0.2); },
    ng: () => tone(220, 0, 0.32, 'square', 0.07, 150),
    star: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.07, 0.22, 'sine', 0.14)),
    result: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.11, 0.18, 'triangle')),
    perfect: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.16, 'triangle')); [1047, 1319, 1568].forEach(f => tone(f, 0.42, 0.6, 'sine', 0.1)); },
    land: () => tone(180, 0, 0.08, 'triangle', 0.16, 110),
    clear: () => { [659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.14, 'triangle')); tone(1319, 0.3, 0.45, 'sine', 0.12); },
    over: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.26, 'triangle', 0.14)),
  };
  function play(name) { if (muted || !SOUNDS[name]) return; try { SOUNDS[name](); } catch (e) { /* 音が出せない環境でも遊べる */ } }
  function chain(n) {
    if (muted) return;
    try { const f = 440 * Math.pow(2, Math.min(n - 1, 9) * 2 / 12); tone(f, 0, 0.1, 'triangle', 0.16); tone(f * 1.5, 0.07, 0.18, 'sine', 0.12); } catch (e) { /* 同上 */ }
  }
  const btn = () => `<button type="button" class="furi-toggle" data-se-toggle aria-pressed="${!muted}">${muted ? '🔇 音なし' : '🔊 音あり'}</button>`;
  function addButtons(root) {
    if (!root.querySelectorAll) return;
    const slots = [...root.querySelectorAll('[data-furi-slot]')];
    if (root.hasAttribute && root.hasAttribute('data-furi-slot')) slots.push(root);
    slots.forEach(s => { if (!s.querySelector('[data-se-toggle]')) (window.furiTools ? window.furiTools(s) : s).insertAdjacentHTML('beforeend', btn()); });
  }
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) addButtons(n); })
    .observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-se-toggle]'); if (!b) return;
    muted = !muted; try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (err) { /* 保存できなくても切りかわる */ }
    document.querySelectorAll('[data-se-toggle]').forEach(x => { x.setAttribute('aria-pressed', !muted); x.textContent = muted ? '🔇 音なし' : '🔊 音あり'; });
    play('select');
  });
  if (document.body) addButtons(document.body);
  return { play, chain, get muted() { return muted; } };
})();

// ---------- げんそラボ 本体(画面)。ルールは engine.js、通信は下の NET
const EL = window.ELEMENTS, CP = window.COMPOUNDS, E = window.ENGINE;
const bySym = {}, byN = {}; EL.forEach(e => { bySym[e.sym] = e; byN[e.n] = e; });
const HAS = new Set(window.HAS_IMG || []);
const CAT_COLOR = { アルカリ金属: '#ff8a65', アルカリ土類金属: '#ffb74d', 遷移金属: '#f08a8a', その他の金属: '#a9bcc6', 半金属: '#81c784', 非金属: '#5fc8f7', ハロゲン: '#ffd54f', 貴ガス: '#c58be0', ランタノイド: '#f48fb1', アクチノイド: '#d6a1e0', 超重元素: '#b79d92' };
const TYPE = { acid: '酸', alkali: 'アルカリ', gas: '気体', salt: '塩', oxide: '酸化物', gem: 'たから', other: '' };
const RARE = ['ノーマル', 'レア', 'スーパーレア', 'ウルトラレア'];
const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (sel, root) => (root || document).querySelector(sel);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fml = f => '<span data-nofuri>' + esc(f).replace(/(\d+)/g, '<sub>$1</sub>') + '</span>';

// ---------- このゲーム専用の効果音(泡・はんのう・酸・パックなど)。音あり/なしは共通の SE に合わせる
const FX = (() => {
  let ctx = null;
  const ac = () => { if (SE.muted) return null; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = ctx || new C(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  function tone(f, at, dur, type, vol, f2) {
    const c = ac(); if (!c) return; const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(at, dur, vol, freq, q) {
    const c = ac(); if (!c) return; const t = c.currentTime + at, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = b; f.type = 'bandpass'; f.frequency.value = freq || 3000; f.Q.value = q || 1;
    g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t);
  }
  const safe = fn => (...a) => { try { fn(...a); } catch (e) { /* 音が出せなくても遊べる */ } };
  const bubbles = (n, base) => { for (let i = 0; i < n; i++) { const f = (base || 350) + Math.random() * 500; tone(f, i * 0.055, 0.09, 'sine', 0.1, f * 1.7); } };
  return {
    take: safe(() => { tone(420, 0, 0.08, 'triangle', 0.16, 840); noise(0, 0.05, 0.04, 5000, 2); }),
    pick: safe(() => tone(700, 0, 0.05, 'triangle', 0.1, 900)),
    react: safe(big => { bubbles(big ? 9 : 5); const ch = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784]; ch.forEach((f, i) => tone(f, 0.3 + i * 0.08, 0.35, 'triangle', 0.14)); if (big) noise(0.3, 0.5, 0.05, 7000, 3); }),
    acid: safe(() => { noise(0, 0.6, 0.12, 4200, 0.8); tone(600, 0, 0.5, 'sawtooth', 0.06, 110); }),
    alkali: safe(() => { bubbles(6, 500); tone(880, 0.3, 0.2, 'sine', 0.12, 1320); }),
    neutral: safe(() => { [392, 494, 587, 784].forEach((f, i) => tone(f, i * 0.07, 0.4, 'sine', 0.13)); }),
    turn: safe(() => { tone(660, 0, 0.1, 'triangle', 0.14); tone(990, 0.1, 0.18, 'triangle', 0.14); }),
    shake: safe(() => { for (let i = 0; i < 5; i++) noise(i * 0.09, 0.06, 0.08, 1800 + i * 300, 2); }),
    card: safe((i, r) => { tone([523, 659, 784, 1047][r] || 523, i * 0.25, 0.25, 'triangle', 0.15); if (r >= 2) [1047, 1319, 1568, 2093].forEach((f, k) => tone(f, i * 0.25 + 0.1 + k * 0.06, 0.3, 'sine', 0.1)); }),
    win: safe(() => { [523, 523, 523, 659, 784, 1047].forEach((f, i) => tone(f, [0, 0.12, 0.24, 0.36, 0.5, 0.68][i], i === 5 ? 0.7 : 0.14, 'square', 0.08)); [262, 330, 392].forEach(f => tone(f, 0.68, 0.7, 'triangle', 0.1)); }),
    lose: safe(() => { [392, 349, 311, 262].forEach((f, i) => tone(f, i * 0.18, 0.3, 'triangle', 0.12)); }),
  };
})();

// ---------- 背景(ゆっくり上がる泡と、うすい六角形のもよう)
(() => {
  const bg = document.createElement('div'); bg.className = 'bgfx'; bg.setAttribute('aria-hidden', 'true');
  const syms = ['H', 'O', 'C', 'N', 'Na', 'Cl', 'Fe', 'Au', 'He', 'Ca', 'Cu', 'S'];
  bg.innerHTML = syms.map((t, i) => `<span style="left:${(i * 8.3 + 3) % 96}%;animation-duration:${16 + (i * 7) % 14}s;animation-delay:-${(i * 5) % 20}s;--s:${26 + (i * 11) % 30}px" data-nofuri>${t}</span>`).join('');
  document.body.prepend(bg);
})();

// ---------- 記録(この端末に保存)
const SAVE_KEY = 'genso-lab-save';
let S = { coins: 60, el: {}, cp: {}, wins: 0, games: 0, name: '', hints: true, lv: 0, miss: {}, quizBest: {} };
try { Object.assign(S, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { /* 保存がなくても遊べる */ }
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 同上 */ } };
const ownEl = () => EL.filter(e => S.el[e.n]).length, ownCp = () => CP.filter(c => S.cp[c.id]).length;

function toast(t, ms) { document.querySelectorAll('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms || 1800); }
function cardHTML(sym, cls, extra) {
  const e = bySym[sym];
  const ph = HAS.has(e.n) ? `<img class="ph" src="img/el/${e.n}.jpg" alt="" loading="lazy">` : `<div class="ph em">${e.em}</div>`;
  return `<button type="button" class="card ${cls || ''}" style="--c:${CAT_COLOR[e.cat]}" data-sym="${sym}" ${extra || ''}><i>${e.n}</i>${ph}<b data-nofuri>${sym}</b><span>${esc(e.ja)}</span></button>`;
}
function topBar(title, backFn, opt) {
  opt = opt || {};
  return `<div class="top">${backFn ? `<button class="back" id="${opt.confirm ? 'quit' : 'back'}" ${opt.confirm ? '' : 'data-noconfirm'}>← ${opt.backLabel || 'もどる'}</button>` : ''}<h2>${title}</h2><span class="coins">🧪 ${S.coins}</span></div>`;
}
let backHandler = null;
document.addEventListener('click', e => { const b = e.target.closest('#back, #quit'); if (b && backHandler) backHandler(); });
function screen(html, onBack) { app.innerHTML = html; backHandler = onBack || null; window.scrollTo(0, 0); }

// ---------- ホーム
function home() {
  NET.leave();
  screen(`
    <div class="top" data-furi-slot></div>
    <div class="hero"><div class="atoms">⚗️</div><h1>げんそ<span>ラボ</span></h1><p class="note">元素を集めて、化合物をつくろう</p></div>
    <div class="menu">
      <button class="btn wide" data-go="battle"><i>⚔️</i>バトル<small>カードを集めて 化合物をつくる。先に${E.TARGET}点で勝ち</small></button>
      <button class="btn" data-go="zukan"><i>📖</i>ずかん<small>元素 ${ownEl()}/118・化合物 ${ownCp()}/${CP.length}</small></button>
      <button class="btn" data-go="pack"><i>🎁</i>パック<small>🧪30で 元素カード3まい</small></button>
      <button class="btn" data-go="quiz"><i>❓</i>クイズ<small>正解で 🧪がもらえる</small></button>
      <button class="btn" data-go="how"><i>💡</i>あそびかた<small>ルールを見る</small></button>
    </div>
    <div class="prog"><div class="row" style="display:flex;justify-content:space-between"><b>🧪 ${S.coins}</b><span class="note">バトル ${S.wins}勝 / ${S.games}回</span></div>
      <div class="note">元素ずかん ${ownEl()} / 118</div><div class="bar"><i style="width:${ownEl() / 118 * 100}%"></i></div>
      <div class="note">化合物ずかん ${ownCp()} / ${CP.length}</div><div class="bar"><i style="width:${ownCp() / CP.length * 100}%"></i></div></div>
    <p class="note" style="text-align:center"><a href="#" id="credit" style="color:var(--mute)">しゃしんについて</a></p>`);
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SE.play('select'); ({ battle: battleMenu, zukan: () => zukan('el'), pack: packScreen, quiz: quizMenu, how: howTo })[b.dataset.go](); });
  $('#credit').onclick = e => { e.preventDefault(); credits(); };
}
function howTo() {
  screen(`${topBar('あそびかた', home)}
    <div class="steps">
      <div><b>カードを2まい とる</b><br>まん中の「実験台」の5まいか、山札から えらぶ。</div>
      <div><b>化合物を つくる</b><br>手ふだの元素を組み合わせる。たとえば H が2まいと O が1まいで「水 H<sub>2</sub>O」。大きい化合物ほど点が高い。</div>
      <div><b>ターンおわり</b><br>手ふだは${E.HAND_MAX}まいまで。先に <b>${E.TARGET}点</b> とった人の勝ち。</div>
    </div>
    <div class="list">
      <div class="prog"><b>🔥 コンボ</b><span class="note">1回のターンに2つ以上つくると、2つ目から +1点。</span></div>
      <div class="prog"><b style="color:var(--acid)">🧪 酸(さん)</b><span class="note">塩酸・硝酸・硫酸・炭酸をつくると、あいての手ふだを1まい とかす。</span></div>
      <div class="prog"><b style="color:var(--alkali)">🧼 アルカリ</b><span class="note">水酸化ナトリウムやアンモニアなどをつくると、山札から1まい ひける。</span></div>
      <div class="prog"><b>⚖️ 中和(ちゅうわ)</b><span class="note">同じターンに 酸とアルカリを両方つくると +2点。</span></div>
      <div class="prog"><b>♻️ 2回目からは1点</b><span class="note">同じ化合物を もう一度つくっても1点。いろいろな化合物をつくろう。</span></div>
    </div>
    <button class="btn main" id="go">バトルを はじめる</button>`, home);
  $('#go').onclick = battleMenu;
}
function credits() {
  const C = window.CREDITS || [];
  screen(`${topBar('しゃしんについて', home)}
    <p class="note">元素の写真は Wikimedia Commons のものです。それぞれの作者とライセンスは下のとおりです(名前をおすと、もとのページが開きます)。写真がない元素は絵文字で表しています。</p>
    <div class="list">${C.map(c => `<a class="note" style="color:var(--ink)" href="${esc(c.page)}" target="_blank" rel="noopener">${c.n} ${esc(c.name)} — ${esc(c.artist)} / ${esc(c.license)}</a>`).join('')}</div>`, home);
}

// ---------- バトルのメニュー
function battleMenu() {
  NET.leave();
  screen(`${topBar('バトル', home)}
    <div class="list">
      <div class="prog"><b>🤖 コンピューターと たいせん</b>
        <div class="tabs" id="lv">${['やさしい', 'ふつう', 'つよい'].map((t, i) => `<button data-lv="${i}" class="${S.lv === i ? 'on' : ''}">${t}</button>`).join('')}</div>
        <button class="btn main" id="cpu">はじめる</button></div>
      <div class="prog"><b>📱 スマホどうしで たいせん</b><span class="note">ふたりのスマホで、同じ「へやの番号」を入れる。</span>
        <div class="acts"><button class="btn" id="mk">へやを つくる</button><button class="btn" id="jn">へやに はいる</button></div></div>
      <div class="prog"><b>🤝 1台で ふたり</b><span class="note">1台のスマホを、かわりばんこに わたして遊ぶ。</span><button class="btn" id="local">はじめる</button></div>
      <label class="prog" style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="hints" ${S.hints ? 'checked' : ''} style="width:22px;height:22px"><span><b>ヒントを出す</b><br><span class="note">つくれる化合物を 教えてくれる。なしにすると、自分でカードをえらんで作る。</span></span></label>
    </div>`, home);
  app.querySelectorAll('#lv button').forEach(b => b.onclick = () => { S.lv = +b.dataset.lv; save(); battleMenu(); });
  $('#hints').onchange = e => { S.hints = e.target.checked; save(); };
  $('#cpu').onclick = () => startBattle({ mode: 'cpu', lv: S.lv, names: [S.name || 'あなた', ['やさしいロボ', 'ふつうロボ', 'つよいロボ'][S.lv]] });
  $('#local').onclick = () => startBattle({ mode: 'local', names: ['1ばんの人', '2ばんの人'] });
  $('#mk').onclick = () => netLobby(true);
  $('#jn').onclick = () => netLobby(false);
}

// ---------- バトル
let B = null;
function startBattle(o) {
  B = { mode: o.mode, lv: o.lv || 0, me: o.me || 0, G: o.G || E.newGame(o.names), sel: [], busy: false, newCp: [], seenSeq: -1, over: false };
  SE.play('start');
  if (B.mode === 'local') return handoff();
  drawBattle();
  if (B.mode === 'cpu' && B.G.turn !== B.me) cpuTurn();
}
const viewer = () => B.mode === 'local' ? B.G.turn : B.me;
const myTurn = () => B.mode === 'local' || B.G.turn === B.me;
function whoHTML(pi, isTop) {
  const G = B.G, p = G.players[pi];
  return `<div class="who ${G.turn === pi && G.winner === null ? 'turn' : ''}"><span class="nm">${esc(p.name)}</span><div class="bar"><i style="width:${Math.min(100, p.score / E.TARGET * 100)}%"></i></div><span class="sc">${p.score}<small>/${E.TARGET}点</small></span>${isTop ? `<span class="backs">${p.hand.slice(0, 10).map(() => '<span class="card back"></span>').join('')}</span>` : ''}</div>`;
}
function drawBattle() {
  if (!B) return;
  const G = B.G, v = viewer(), p = G.players[v], mine = myTurn() && G.winner === null && !B.busy;
  const over = mine ? E.overHand(G) : 0;
  const can = E.makeable(p.hand), near = E.near(p.hand);
  const needSyms = new Set(near.map(x => x.need));
  let msg;
  if (G.winner !== null) msg = '';
  else if (!myTurn()) msg = `${esc(G.players[G.turn].name)}の ばん…`;
  else if (G.takes > 0) msg = `カードを <b>${G.takes}まい</b> とろう`;
  else if (over) msg = `手ふだが多いよ。<b>${over}まい</b> えらんで すてよう`;
  else if (can.length) msg = S.hints ? 'つくれる化合物が あるよ' : 'カードをえらんで「はんのう!」';
  else msg = 'つくれるものが ないときは「ターンおわり」';
  const selSyms = B.sel.map(i => p.hand[i]);
  const exact = selSyms.length ? E.matchExact(selSyms) : null;
  const chips = !mine || G.takes > 0 || over ? '' : S.hints
    ? can.sort((a, b) => E.pointsFor(G, v, b) - E.pointsFor(G, v, a)).slice(0, 4).map(c => `<button class="chip ${c.t}" data-make="${c.id}">${c.em} <span class="f">${fml(c.f)}</span> ${esc(c.ja)} <span class="pt">+${E.pointsFor(G, v, c)}</span></button>`).join('') +
      (can.length > 4 ? `<span class="chip near">ほかに ${can.length - 4}こ(📖レシピで見られる)</span>` : '') +
      near.filter(x => !can.includes(x.c)).sort((a, b) => b.c.pt - a.c.pt).slice(0, can.length >= 3 ? 0 : 2).map(x => `<span class="chip near"><span class="f">${fml(x.c.f)}</span> ${esc(x.c.ja)} あと <b data-nofuri>${x.need}</b></span>`).join('')
    : '';
  screen(`
    <div class="top"><button class="back" id="quit">← やめる</button><h2 style="font-size:15px">${B.mode === 'net' ? '📱 へや ' + NET.code : B.mode === 'cpu' ? '🤖 コンピューター' : '🤝 1台で ふたり'}</h2><button class="back" id="book" style="background:var(--accent);color:var(--accent-ink)">📖 レシピ</button></div>
    ${whoHTML(1 - v, true)}
    <div class="table">
      <h3><span>実験台(ここから とれる)</span><span>山札 ${G.deck.length}まい</span></h3>
      <div class="market">${G.market.map((s, i) => s ? cardHTML(s, mine && G.takes > 0 && S.hints && needSyms.has(s) ? 'hint' : '', `data-m="${i}"`) : '').join('')}<button class="deck" id="deck">山札<br>から</button></div>
    </div>
    <div class="msg">${msg}</div>
    <div class="chips">${chips}</div>
    ${whoHTML(v, false)}
    <div class="hand">${p.hand.map((s, i) => cardHTML(s, B.sel.includes(i) ? 'sel' : '', `data-h="${i}"`)).join('')}</div>
    <div class="acts">
      ${!S.hints || exact ? `<button class="btn main" id="react" ${mine && G.takes === 0 && !over && exact ? '' : 'disabled'}>⚗️ はんのう!${exact ? ' ' + esc(exact.ja) : ''}</button>` : ''}
      <button class="btn ${can.length && S.hints ? '' : 'main'}" id="end" ${mine && G.takes === 0 && !over ? '' : 'disabled'}>ターンおわり</button>
    </div>`, quitBattle);
  $('#book').onclick = () => recipeBook();
  if (!mine) return;
  app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => doTake(+b.dataset.m));
  $('#deck').onclick = () => doTake('deck');
  app.querySelectorAll('[data-h]').forEach(b => b.onclick = () => {
    const i = +b.dataset.h;
    if (over) { E.discard(G, p.hand[i]); SE.play('select'); B.sel = []; pushNet(); return drawBattle(); }
    B.sel = B.sel.includes(i) ? B.sel.filter(x => x !== i) : B.sel.concat(i); FX.pick(); drawBattle();
  });
  app.querySelectorAll('[data-make]').forEach(b => b.onclick = () => doMake(b.dataset.make));
  const r = $('#react'); if (r) r.onclick = () => exact && doMake(exact.id);
  $('#end').onclick = doEnd;
}
function doTake(src) {
  const G = B.G; if (G.takes <= 0) return toast('もう とれないよ。化合物をつくるか、ターンおわり');
  if (!E.take(G, src)) return;
  FX.take(); B.sel = []; pushNet(); drawBattle();
  const cards = app.querySelectorAll('.hand .card'); const last = cards[cards.length - 1]; if (last) last.classList.add('pop');
}
async function doMake(id) {
  const G = B.G, who = G.turn, ev = E.make(G, id);
  if (!ev) return;
  B.sel = []; pushNet();
  noteMade(ev, who);
  await reveal(ev, true);
  if (G.winner !== null) return finish();
  drawBattle();
}
function doEnd() {
  const G = B.G;
  if (!E.endTurn(G)) return;
  B.sel = []; SE.play('select'); pushNet();
  if (B.mode === 'local') return handoff();
  drawBattle();
  if (B.mode === 'cpu') cpuTurn();
}
// 自分(この端末の人)が作ったものを ずかんに入れる
function noteMade(ev, who) {
  if (B.mode !== 'local' && who !== B.me) return;
  const c = E.byId[ev.id];
  if (!S.cp[c.id]) { B.newCp.push(c.id); }
  S.cp[c.id] = (S.cp[c.id] || 0) + 1;
  for (const s of Object.keys(c.p)) { const n = bySym[s].n; if (!S.el[n]) S.el[n] = 1; }
  save();
}
function reveal(ev, mine) {
  return new Promise(res => {
    const c = E.byId[ev.id], G = B.G, by = G.players[ev.by];
    let ai = 0; const total = c.size;
    const atoms = Object.entries(c.p).map(([s, n]) => Array.from({ length: n }, () => { const a = (ai++ / total) * Math.PI * 2; return `<span class="atom fly" style="--c:${CAT_COLOR[bySym[s].cat]};--dx:${Math.round(Math.cos(a) * 120)}px;--dy:${Math.round(Math.sin(a) * 90)}px" data-nofuri>${s}</span>`; }).join('')).join('');
    const eff = ev.effect ? (ev.effect.kind === 'acid' ? `<span class="badge acid">🧪 酸! あいての ${bySym[ev.effect.lost].ja}(<span data-nofuri>${ev.effect.lost}</span>)を とかした</span>` : `<span class="badge alkali">🧼 アルカリ! 1まい ひいた</span>`) : '';
    const d = document.createElement('div'); d.className = 'ov';
    d.innerHTML = `<div class="box"><div class="who2">${esc(by.name)}の はんのう!</div><div class="atoms">${atoms}</div><div class="em born">${c.em}</div><div class="f">${fml(c.f)}</div><div class="nm">${esc(c.ja)}</div>
      <p>${esc(c.note)}</p><div class="pt">+${ev.pt}点</div>
      <div class="badges">${ev.first ? '<span class="badge new">はじめて!</span>' : '<span class="badge" style="background:#8892b8;color:#fff">2回目からは1点</span>'}${ev.combo ? '<span class="badge">🔥 コンボ +1</span>' : ''}${ev.neutral ? '<span class="badge">⚖️ 中和 +2</span>' : ''}${eff}</div>
      <button class="btn main">OK</button></div>`;
    document.body.appendChild(d);
    FX.react(c.pt >= 8);
    if (ev.effect && ev.effect.kind === 'acid') setTimeout(FX.acid, 700);
    if (ev.effect && ev.effect.kind === 'alkali') setTimeout(FX.alkali, 700);
    if (ev.neutral) setTimeout(FX.neutral, 1100);
    if (ev.effect && ev.effect.kind === 'acid') { d.querySelector('.box').classList.add('acidhit'); }
    let done = false; const close = () => { if (done) return; done = true; d.remove(); res(); };
    d.onclick = close; if (!mine) setTimeout(close, 2600);
  });
}
async function cpuTurn() {
  const G = B.G; B.busy = true; drawBattle();
  await sleep(700);
  while (G.takes > 0 && B && B.G === G) {
    const src = E.cpuTake(G, B.lv); E.take(G, src);
    toast(`${G.players[G.turn].name}: ${src === 'deck' ? '山札から 1まい' : bySym[G.last.card].ja + '(' + G.last.card + ')を とった'}`, 1300);
    FX.take(); drawBattle(); await sleep(1000);
  }
  for (let k = 0; k < 8 && B && B.G === G; k++) {
    const id = E.cpuMake(G, B.lv); if (!id) break;
    const ev = E.make(G, id); if (!ev) break;
    drawBattle(); await reveal(ev, false);
    if (G.winner !== null) { B.busy = false; return finish(); }
    await sleep(300);
  }
  if (!B || B.G !== G) return;
  while (E.overHand(G) > 0) E.discard(G, E.cpuDiscard(G));
  E.endTurn(G); B.busy = false; drawBattle(); yourTurn();
}
function yourTurn() {
  FX.turn();
  const d = document.createElement('div'); d.className = 'banner'; d.textContent = 'あなたの ばん!'; document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
}
function confetti() {
  const d = document.createElement('div'); d.className = 'confetti'; d.setAttribute('aria-hidden', 'true');
  const cols = Object.values(CAT_COLOR);
  d.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="left:${rnd(100)}%;background:${cols[i % cols.length]};animation-delay:${(i % 12) * 0.08}s;animation-duration:${1.6 + (i % 5) * 0.3}s"></i>`).join('');
  document.body.appendChild(d); setTimeout(() => d.remove(), 3600);
}
function handoff() {
  const G = B.G;
  screen(`<div class="hero"><div class="atoms">🤝</div><h1 style="font-size:26px">つぎは<br><span>${esc(G.players[G.turn].name)}</span>の ばん</h1><p class="note">スマホを わたしてね。あいての手ふだは 見ないでね。</p></div><button class="btn main" id="ok">${esc(G.players[G.turn].name)}です。はじめる</button><button class="back" id="quit" style="align-self:center">← やめる</button>`, quitBattle);
  $('#ok').onclick = () => { SE.play('select'); drawBattle(); };
}
function quitBattle() { B = null; NET.leave(); battleMenu(); }
function finish() {
  if (B.over) return; B.over = true;
  const G = B.G, w = G.winner, local = B.mode === 'local', win = local || w === B.me;
  let coin = local ? 25 : win ? [30, 40, 60][B.mode === 'cpu' ? B.lv : 1] : 15;
  const bonus = B.newCp.length * 5;
  S.coins += coin + bonus; S.games++; if (win && !local) S.wins++; save();
  win ? FX.win() : FX.lose(); if (win) confetti();
  screen(`<div class="hero"><div class="atoms">${win ? '🏆' : '🧪'}</div><h1 style="font-size:28px">${local ? esc(G.players[w].name) + 'の 勝ち!' : win ? 'あなたの 勝ち!' : 'ざんねん、まけ…'}</h1>
      <p>${G.players.map(p => `${esc(p.name)} ${p.score}点`).join(' / ')}</p></div>
    <div class="prog"><b>🧪 +${coin}${bonus ? ` / はじめての化合物 ${B.newCp.length}こ +${bonus}` : ''}</b>
      ${B.newCp.length ? `<div class="chips">${B.newCp.map(id => `<span class="chip">${E.byId[id].em} ${fml(E.byId[id].f)} ${esc(E.byId[id].ja)}</span>`).join('')}</div>` : '<span class="note">新しい化合物をつくると、ずかんが ふえて 🧪 ももらえるよ。</span>'}</div>
    <div class="prog"><b>このバトルで つくったもの</b><div class="note">${G.players.map((p, i) => `${esc(p.name)}: ${G.log.filter(l => l.by === i).map(l => E.byId[l.id].ja).join('、') || 'なし'}`).join('<br>')}</div></div>
    <div class="acts"><button class="btn main" id="again">もういちど</button><button class="btn" id="hm" >ホーム</button></div>`);
  const mode = B.mode, lv = B.lv, names = G.players.map(p => p.name);
  $('#again').onclick = () => { if (mode === 'net') return NET.rematch(); startBattle({ mode, lv, names }); };
  $('#hm').onclick = () => { B = null; home(); };
}
function recipeBook() {
  const d = document.createElement('div'); d.className = 'ov'; d.style.alignItems = 'start'; d.style.overflow = 'auto';
  const p = B ? B.G.players[viewer()] : null, can = p ? new Set(E.makeable(p.hand).map(c => c.id)) : new Set();
  d.innerHTML = `<div class="box" style="max-width:520px;text-align:left"><div class="top"><h2>📖 レシピ</h2><button class="back">とじる</button></div><div class="rgrid">${recipeList(can)}</div></div>`;
  document.body.appendChild(d);
  d.onclick = e => { if (e.target === d || e.target.closest('.back')) d.remove(); };
}
function recipeList(can) {
  return CP.slice().sort((a, b) => a.pt - b.pt).map(c => `<div class="recipe ${S.cp[c.id] ? 'done' : ''}" ${can && can.has(c.id) ? 'style="background:#1f5a45"' : ''}>
    <div class="row"><span class="f">${c.em} ${fml(c.f)}</span><b style="font-family:var(--fn)">${c.pt}点</b></div><div class="nm">${esc(c.ja)}</div>
    <div class="row"><span class="note" data-nofuri>${Object.entries(c.p).map(([s, n]) => s + '×' + n).join(' ')}</span>${TYPE[c.t] ? `<span class="tp ${c.t}">${TYPE[c.t]}</span>` : ''}</div></div>`).join('');
}

// ---------- スマホどうしの対戦(Firebase Realtime Database。へやの番号で つなぐ)
const NET = (() => {
  const FB = { key: 'AIzaSyBtHJIu3qhfg0g7gfG64euPs97xSBmLAq8', db: 'https://digimoncard-ia1c84-default-rtdb.firebaseio.com' };
  let tok = null, exp = 0, es = null, room = null, lastSeq = -1;
  const api = { code: null, host: false, onRoom: null, onGone: null };
  async function auth() {
    if (tok && Date.now() < exp) return tok;
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FB.key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' });
    const j = await r.json(); if (!j.idToken) throw new Error('auth');
    tok = j.idToken; exp = Date.now() + 50 * 60 * 1000; return tok;
  }
  const url = async (sub) => `${FB.db}/gensoRooms/${api.code}${sub || ''}.json?auth=${await auth()}`;
  async function put(sub, val, method) { const r = await fetch(await url(sub), { method: method || 'PUT', body: JSON.stringify(val) }); if (!r.ok) throw new Error('net ' + r.status); return r.json(); }
  async function listen() {
    if (es) es.close();
    es = new EventSource(await url());
    const on = e => {
      let d; try { d = JSON.parse(e.data); } catch (x) { return; }
      if (!d) return;
      if (d.path === '/') room = e.type === 'patch' ? Object.assign(room || {}, d.data) : d.data;
      else { room = room || {}; room[d.path.slice(1).split('/')[0]] = d.data; }
      if (room === null) { if (api.onGone) api.onGone(); return; }
      if (api.onRoom) api.onRoom(room);
    };
    es.addEventListener('put', on); es.addEventListener('patch', on);
    es.onerror = () => { /* 自動でつなぎ直す */ };
  }
  api.create = async name => {
    for (let i = 0; i < 5; i++) {
      api.code = String(1000 + rnd(9000));
      const cur = await (await fetch(await url())).json();
      if (!cur || Date.now() - (cur.t || 0) > 3 * 3600 * 1000) break;
    }
    api.host = true; room = { host: name, t: Date.now() };
    await put('', room); await listen(); return api.code;
  };
  api.join = async (code, name) => {
    api.code = code; api.host = false;
    const cur = await (await fetch(await url())).json();
    if (!cur || !cur.host) throw new Error('noroom');
    if (cur.guest && cur.g) throw new Error('full');
    await put('/guest', name); await listen();
  };
  api.sendGame = async G => { lastSeq = G.seq; try { await put('/g', JSON.stringify(G)); } catch (e) { toast('通信できなかった。もういちど ためすよ'); setTimeout(() => api.sendGame(G), 1500); } };
  api.rematch = () => { if (api.host) { const names = B.G.players.map(p => p.name); const G = E.newGame(names); startBattle({ mode: 'net', me: 0, G }); api.sendGame(G); } else toast('へやを つくった人が「もういちど」を おしてね'); };
  api.leave = () => { if (es) { es.close(); es = null; } if (api.code && api.host) { const c = api.code; auth().then(t => fetch(`${FB.db}/gensoRooms/${c}.json?auth=${t}`, { method: 'DELETE' })).catch(() => {}); } api.code = null; api.onRoom = null; room = null; lastSeq = -1; };
  Object.defineProperty(api, 'lastSeq', { get: () => lastSeq, set: v => { lastSeq = v; } });
  return api;
})();
function pushNet() { if (B && B.mode === 'net') NET.sendGame(B.G); }
function netLobby(isHost) {
  const nameIn = `<input class="txt" id="nm" maxlength="8" placeholder="なまえ(8文字まで)" value="${esc(S.name)}">`;
  screen(`${topBar(isHost ? 'へやを つくる' : 'へやに はいる', battleMenu)}
    <div class="prog"><b>なまえ</b>${nameIn}</div>
    ${isHost ? '' : '<div class="prog"><b>へやの番号(4けた)</b><input class="txt" id="code" inputmode="numeric" maxlength="4" placeholder="1234"></div>'}
    <button class="btn main" id="go">${isHost ? 'へやを つくる' : 'はいる'}</button><p class="note" id="st"></p>`, battleMenu);
  $('#go').onclick = async () => {
    const name = $('#nm').value.trim() || (isHost ? 'ホスト' : 'ゲスト'); S.name = name; save();
    const st = $('#st'); st.textContent = 'つないでいます…';
    try {
      NET.onRoom = onRoom; NET.onGone = () => { if (!NET.host && NET.code) { toast('あいてが へやを とじたよ', 2500); B = null; NET.leave(); battleMenu(); } };
      if (isHost) { const code = await NET.create(name); waitRoom(code); }
      else { const code = $('#code').value.trim(); if (!/^\d{4}$/.test(code)) { st.textContent = '4けたの番号を入れてね'; return; } await NET.join(code, name); st.textContent = 'はいったよ。あいてが はじめるのを まっています…'; }
    } catch (e) { st.textContent = e.message === 'noroom' ? 'その番号のへやが見つからないよ' : e.message === 'full' ? 'そのへやは もう2人いるよ' : 'つながらなかった。ネットを たしかめてね(' + e.message + ')'; }
  };
}
function waitRoom(code) {
  screen(`${topBar('へや', battleMenu)}<div class="hero"><p class="note">へやの番号</p><h1 data-nofuri style="font-family:var(--fn);font-size:64px;letter-spacing:.1em">${code}</h1><p>あいてのスマホで「へやに はいる」をおして、この番号を入れてね。</p><p class="note" id="st">あいてを まっています…</p></div>`, battleMenu);
}
function onRoom(room) {
  if (!NET.code) return;
  // ホスト: あいてが入ったら、ゲームを作って送る
  if (NET.host && room.guest && !room.g && !(B && B.mode === 'net')) {
    const G = E.newGame([room.host, room.guest]);
    startBattle({ mode: 'net', me: 0, G }); NET.sendGame(G); return;
  }
  if (!room.g) return;
  let G; try { G = JSON.parse(room.g); } catch (e) { return; }
  const me = NET.host ? 0 : 1;
  if (!B || B.mode !== 'net' || (B.over && G.seq < 3)) { NET.lastSeq = G.seq; return startBattle({ mode: 'net', me, G }); }
  if (G.seq <= B.G.seq) return; // 自分が送ったもの、または古いもの
  const prevLog = B.G.log.length;
  B.G = G; NET.lastSeq = G.seq;
  drawBattle();
  if (G.log.length > prevLog && G.last && G.last.type === 'make' && G.last.by !== B.me) reveal(G.last, false).then(() => { if (B && B.G.winner !== null) finish(); });
  else if (G.winner !== null) finish();
  else if (G.last && G.last.type === 'end' && G.turn === B.me) yourTurn();
}

// ---------- ずかん
let zTab = 'el';
function zukan(tab) {
  zTab = tab || zTab;
  const cats = Object.keys(CAT_COLOR);
  let body;
  if (zTab === 'el') {
    const cells = [];
    for (let p = 1; p <= 9; p++) {
      if (p === 8) cells.push('<div class="gap"></div>');
      for (let g = 1; g <= 18; g++) {
        const e = EL.find(x => x.p === p && x.g === g);
        cells.push(e ? `<button data-n="${e.n}" class="${S.el[e.n] ? '' : 'no'}" style="--c:${CAT_COLOR[e.cat]}" data-nofuri>${e.sym}</button>` : '<span></span>');
      }
    }
    body = `<p class="note">周期表(しゅうきひょう)。色がついているのが、もっている元素。おすと くわしく見られる。${ownEl()} / 118</p>
      <div class="ptable">${cells.join('')}</div>
      <div class="legend">${cats.map(c => `<span><i style="--c:${CAT_COLOR[c]}"></i>${c}</span>`).join('')}</div>
      <div class="hand" style="justify-content:flex-start">${EL.filter(e => S.el[e.n]).map(e => cardHTML(e.sym, '', `data-n="${e.n}"`)).join('') || '<span class="note">バトルで使った元素と、パックで出た元素が ここに ならぶよ。</span>'}</div>`;
  } else {
    body = `<p class="note">バトルで つくると、わくが緑になる。${ownCp()} / ${CP.length}</p><div class="rgrid">${recipeList()}</div>`;
  }
  screen(`${topBar('ずかん', home)}<div class="tabs"><button data-t="el" class="${zTab === 'el' ? 'on' : ''}">元素 118</button><button data-t="cp" class="${zTab === 'cp' ? 'on' : ''}">化合物 ${CP.length}</button></div>${body}`, home);
  app.querySelectorAll('.tabs button').forEach(b => b.onclick = () => zukan(b.dataset.t));
  app.querySelectorAll('[data-n]').forEach(b => b.onclick = () => elDetail(+b.dataset.n));
}
function elDetail(n) {
  const e = byN[n], own = S.el[n];
  const uses = CP.filter(c => c.p[e.sym] && Object.keys(c.p).length > 1);
  const d = document.createElement('div'); d.className = 'ov'; d.style.overflow = 'auto';
  d.innerHTML = `<div class="box detail" style="border-top:8px solid ${CAT_COLOR[e.cat]}">
    ${own ? (HAS.has(n) ? `<img class="photo" src="img/el/${n}.jpg" alt="">` : `<div class="bigem">${e.em}</div>`) : '<div class="bigem">❔</div>'}
    <div class="sym" data-nofuri>${e.sym}</div><div class="nm" style="font-size:24px;font-weight:900">${own ? esc(e.ja) : '？？？'}</div>
    ${own ? `<p>${e.em} ${esc(e.note)}</p>
    <dl class="facts"><dt>原子番号</dt><dd>${e.n}</dd><dt>なかま</dt><dd>${esc(e.cat)}</dd>${e.st ? `<dt>ふつうの温度で</dt><dd>${e.st}</dd>` : ''}<dt>レア度</dt><dd>${RARE[e.r]}</dd><dt>もっている数</dt><dd>${own}まい</dd></dl>
    ${uses.length ? `<div class="chips">${uses.map(c => `<span class="chip near" style="color:var(--ink)">${c.em} ${fml(c.f)} ${esc(c.ja)}</span>`).join('')}</div>` : ''}`
    : `<p class="note">まだ もっていない元素。原子番号 ${e.n}・${esc(e.cat)}。<br>パックで あてるか、バトルで使うと 見られるよ。</p>`}
    <button class="btn main">とじる</button></div>`;
  document.body.appendChild(d); SE.play('select');
  d.onclick = ev => { if (ev.target === d || ev.target.closest('.btn')) d.remove(); };
}

// ---------- パック
const PACK_COST = 30;
function packScreen(result) {
  screen(`${topBar('パック', home)}
    <div class="prog" style="text-align:center"><b>元素パック</b><span class="note">元素カードが3まい出る。めずらしい元素ほど出にくい。同じカードが出たら 🧪3 にかわる。</span>
      <div class="pack" id="pk">${result ? result.map((r, i) => `<span class="slot" style="animation-delay:${i * 0.25}s">${cardHTML(r.e.sym, 'big pop rare' + r.e.r, `data-n="${r.e.n}"`)}${r.isNew ? '<span class="newtag">NEW!</span>' : ''}</span>`).join('') : '<div style="font-size:90px">🎁</div>'}</div>
      ${result ? `<p>${result.map(r => `${esc(r.e.ja)}(${RARE[r.e.r]})`).join('・')}</p>` : ''}
      <button class="btn main" id="open" ${S.coins < PACK_COST ? 'disabled' : ''}>🧪${PACK_COST}で あける</button>
      ${S.coins < PACK_COST ? '<p class="note">🧪が たりない。バトルやクイズで ためよう。</p>' : ''}</div>
    <p class="note" style="text-align:center">元素ずかん ${ownEl()} / 118</p>`, home);
  $('#open').onclick = () => {
    if (S.coins < PACK_COST) return;
    S.coins -= PACK_COST;
    const W = [10, 6, 3, 1], pool = []; EL.forEach(e => { for (let i = 0; i < W[e.r]; i++) pool.push(e); });
    const res = [];
    for (let i = 0; i < 3; i++) { const e = pick(pool); const isNew = !S.el[e.n]; S.el[e.n] = (S.el[e.n] || 0) + 1; if (!isNew) S.coins += 3; res.push({ e, isNew }); }
    save(); FX.shake(); const pk = $('#pk'); if (pk) pk.classList.add('shaking');
    setTimeout(() => { res.forEach((r, i) => FX.card(i, r.e.r)); packScreen(res); }, 520);
  };
  app.querySelectorAll('[data-n]').forEach(b => b.onclick = () => elDetail(+b.dataset.n));
}

// ---------- クイズ
const QSETS = [
  { k: 'a', name: '原子番号 1〜20', list: () => EL.filter(e => e.n <= 20) },
  { k: 'b', name: '原子番号 1〜36', list: () => EL.filter(e => e.n <= 36) },
  { k: 'c', name: 'ぜんぶの元素(118)', list: () => EL },
  { k: 'd', name: 'もっている元素だけ', list: () => EL.filter(e => S.el[e.n]) },
  { k: 'e', name: '化合物(化学式と名前)', cp: true },
];
function quizMenu() {
  screen(`${topBar('クイズ', home)}<p class="note">10問。1問正解で 🧪2、全問正解で さらに 🧪10。</p>
    <div class="list">${QSETS.map(q => `<button class="btn" data-k="${q.k}" style="text-align:left">${q.name}<br><span class="note">さいこう ${S.quizBest[q.k] || 0} / 10</span></button>`).join('')}</div>`, home);
  app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const set = QSETS.find(q => q.k === b.dataset.k);
    if (!set.cp && set.list().length < 4) return toast('元素を4つ以上 あつめてから ちょうせんしよう');
    startQuiz(set);
  });
}
function makeQuestion(set) {
  if (set.cp) {
    const c = pick(CP.filter(x => Object.keys(x.p).length > 1 || x.id === 'h2' || x.id === 'o2')), others = shuffle(CP.filter(x => x !== c && x.ja !== c.ja)).slice(0, 3);
    const kind = rnd(3);
    if (kind === 0) return { q: `<div class="big">${fml(c.f)}</div><p>この化学式の 名前は?</p>`, opts: shuffle([c, ...others]).map(x => ({ t: x.ja, ok: x === c })), ex: `${c.f} は ${c.ja}。${c.note}`, key: 'c' + c.id };
    if (kind === 1) return { q: `<div class="big" style="font-size:30px">${c.em} ${esc(c.ja)}</div><p>化学式は どれ?</p>`, opts: shuffle([c, ...others]).map(x => ({ t: x.f, f: true, ok: x === c })), ex: `${c.ja} は ${c.f}。${c.note}`, key: 'c' + c.id };
    return { q: `<div style="font-size:54px">${c.em}</div><p>${esc(c.note)}</p><p>これは どれ?</p>`, opts: shuffle([c, ...others]).map(x => ({ t: x.ja, ok: x === c })), ex: `${c.ja}(${c.f})`, key: 'c' + c.id };
  }
  const list = set.list();
  // まちがえた元素は 出やすくする
  const bag = []; list.forEach(e => { const w = 1 + Math.min(3, S.miss['e' + e.n] || 0) * 2; for (let i = 0; i < w; i++) bag.push(e); });
  const e = pick(bag), near = list.filter(x => x !== e).sort((a, b) => Math.abs(a.n - e.n) - Math.abs(b.n - e.n)).slice(0, 8), others = shuffle(near).slice(0, 3);
  const all = shuffle([e, ...others]), kind = rnd(HAS.has(e.n) ? 4 : 3);
  const ex = `${e.sym} は ${e.ja}(原子番号${e.n})。${e.note}`;
  if (kind === 0) return { q: `<div class="big" data-nofuri>${e.sym}</div><p>この元素記号の 名前は?</p>`, opts: all.map(x => ({ t: x.ja, ok: x === e })), ex, key: 'e' + e.n };
  if (kind === 1) return { q: `<div class="big" style="font-size:34px">${esc(e.ja)}</div><p>元素記号は どれ?</p>`, opts: all.map(x => ({ t: x.sym, f: true, ok: x === e })), ex, key: 'e' + e.n };
  if (kind === 2) return { q: `<div style="font-size:54px">${e.em}</div><p>${esc(e.note)}</p><p>この元素は どれ?</p>`, opts: all.map(x => ({ t: x.ja, ok: x === e })), ex, key: 'e' + e.n };
  return { q: `<img src="img/el/${e.n}.jpg" alt=""><p>この写真の元素は どれ?</p>`, opts: all.map(x => ({ t: `${x.ja}(${x.sym})`, ok: x === e })), ex, key: 'e' + e.n };
}
function startQuiz(set) {
  const Q = { set, i: 0, ok: 0, cur: null };
  const next = () => {
    if (Q.i >= 10) return quizResult(Q);
    Q.cur = makeQuestion(set); Q.i++;
    screen(`<div class="top"><button class="back" id="quit">← やめる</button><h2>${Q.i} / 10</h2><span class="coins">⭕ ${Q.ok}</span></div>
      <div class="q">${Q.cur.q}</div><div class="opts">${Q.cur.opts.map((o, i) => `<button data-i="${i}" ${o.f ? 'data-nofuri style="font-family:var(--fn);font-size:22px"' : ''}>${o.f ? fml(o.t) : esc(o.t)}</button>`).join('')}</div><div id="ex"></div>`, quizMenu);
    app.querySelectorAll('.opts button').forEach(b => b.onclick = () => {
      if (Q.done) return; Q.done = true;
      const o = Q.cur.opts[+b.dataset.i];
      app.querySelectorAll('.opts button').forEach((x, i) => { if (Q.cur.opts[i].ok) x.classList.add('ok'); });
      if (o.ok) { Q.ok++; SE.play('ok'); if (S.miss[Q.cur.key]) S.miss[Q.cur.key]--; } else { b.classList.add('ng'); SE.play('ng'); S.miss[Q.cur.key] = (S.miss[Q.cur.key] || 0) + 1; }
      $('#ex').innerHTML = `<div class="prog"><b>${o.ok ? '⭕ せいかい!' : '❌ ざんねん'}</b><span>${esc(Q.cur.ex)}</span><button class="btn main" id="nx">つぎへ</button></div>`;
      $('#nx').onclick = () => { Q.done = false; next(); };
      $('#nx').scrollIntoView({ block: 'nearest' });
    });
  };
  SE.play('start'); next();
}
function quizResult(Q) {
  const coin = Q.ok * 2 + (Q.ok === 10 ? 10 : 0);
  S.coins += coin; S.quizBest[Q.set.k] = Math.max(S.quizBest[Q.set.k] || 0, Q.ok); save();
  SE.play(Q.ok === 10 ? 'perfect' : 'result');
  screen(`<div class="hero"><div class="atoms">${Q.ok === 10 ? '🎉' : Q.ok >= 7 ? '😊' : '💪'}</div><h1 style="font-size:30px">${Q.ok} / 10</h1><p>🧪 +${coin}</p></div>
    <div class="acts"><button class="btn main" id="again">もういちど</button><button class="btn" id="hm">ホーム</button></div>`);
  $('#again').onclick = () => startQuiz(Q.set); $('#hm').onclick = home;
}

home();
// テスト用
window.GL = { get S() { return S; }, get B() { return B; }, save, home, startBattle, E, NET };

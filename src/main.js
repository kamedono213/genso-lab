// ---------- げんそラボ 本体(画面)。ルールは engine.js、通信は下の NET
const EL = window.ELEMENTS, CP = window.COMPOUNDS, E = window.ENGINE;
const bySym = {}, byN = {}; EL.forEach(e => { bySym[e.sym] = e; byN[e.n] = e; });
const HAS = new Set(window.HAS_IMG || []);
const CAT_COLOR = { アルカリ金属: '#ff8a65', アルカリ土類金属: '#ffb74d', 遷移金属: '#f08a8a', その他の金属: '#a9bcc6', 半金属: '#81c784', 非金属: '#5fc8f7', ハロゲン: '#ffd54f', 貴ガス: '#c58be0', ランタノイド: '#f48fb1', アクチノイド: '#d6a1e0', 超重元素: '#b79d92' };
const TYPE = { acid: '酸', alkali: 'アルカリ', gas: '気体', salt: 'えん(塩)', oxide: '酸化物', gem: 'たから', other: '' };
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
const S_DEF = { coins: 60, el: {}, cp: {}, wins: 0, games: 0, name: '', hints: true, lv: 0, miss: {}, quizBest: {}, st: {}, ach: {} };
let S = JSON.parse(JSON.stringify(S_DEF));
try { Object.assign(S, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { /* 保存がなくても遊べる */ }
const save = () => { S.t = Date.now(); achCheck(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 同上 */ } CLOUD.queue(); };
// ブラウザが勝手に記録を消さないよう たのむ(きいてくれない機種もある)
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* なくても動く */ }
const RTAG = ['N', 'R', 'SR', 'UR'];
const IN_DECK = window.DECK_COUNTS || {};
const ownEl = () => EL.filter(e => S.el[e.n]).length, ownCp = () => CP.filter(c => S.cp[c.id]).length;

function toast(t, ms) { document.querySelectorAll('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms || 1800); }
function cardHTML(sym, cls, extra, inner) {
  const e = bySym[sym];
  const ph = HAS.has(e.n) ? `<img class="ph" src="img/el/${e.n}.jpg" alt="" loading="lazy">` : `<div class="ph em">${e.em}</div>`;
  return `<button type="button" class="card ${cls || ''}" style="--c:${CAT_COLOR[e.cat]}" data-sym="${sym}" ${extra || ''}><i>${e.n}</i><u class="rty r${e.r}" data-nofuri>${RTAG[e.r]}</u>${ph}<b data-nofuri>${sym}</b><span>${esc(e.ja)}</span>${inner || ''}</button>`;
}
function topBar(title, backFn, opt) {
  opt = opt || {};
  return `<div class="top">${backFn ? `<button class="back" id="${opt.confirm ? 'quit' : 'back'}" ${opt.confirm ? '' : 'data-noconfirm'}>← ${opt.backLabel || 'もどる'}</button>` : ''}<h2>${title}</h2><span class="coins">🧪 ${S.coins}</span></div>`;
}
let backHandler = null, atHome = false;
document.addEventListener('click', e => { const b = e.target.closest('#back, #quit'); if (b && backHandler) backHandler(); });
function screen(html, onBack) { atHome = false; app.innerHTML = html; backHandler = onBack || null; window.scrollTo(0, 0); }

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
      <button class="btn" data-go="ach"><i>🏅</i>じっせき<small>${achCount()} / ${ACH.length} たっせい</small></button>
    </div>
    <div class="prog"><div class="row" style="display:flex;justify-content:space-between"><b>🧪 ${S.coins}</b><span class="note">バトル ${S.wins}勝 / ${S.games}回</span></div>
      <div class="note">元素ずかん ${ownEl()} / 118</div><div class="bar"><i style="width:${ownEl() / 118 * 100}%"></i></div>
      <div class="note">化合物ずかん ${ownCp()} / ${CP.length}</div><div class="bar"><i style="width:${ownCp() / CP.length * 100}%"></i></div></div>
    <p class="note" style="text-align:center"><a href="#" id="keep" style="color:${S.id ? 'var(--mute)' : 'var(--accent)'}">${S.id ? '☁️ ID「' + esc(S.id) + '」で ほぞん中' : '💾 きろくを ネットにも ほぞんする'}</a> ・ <a href="#" id="credit" style="color:var(--mute)">しゃしんについて</a></p>`);
  atHome = true;
  $('#keep').onclick = e => { e.preventDefault(); keepScreen(); };
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SE.play('select'); ({ battle: battleMenu, zukan: () => zukan('el'), pack: packScreen, quiz: quizMenu, ach: achScreen })[b.dataset.go](); });
  $('#credit').onclick = e => { e.preventDefault(); credits(); };
}
function howTo() {
  screen(`${topBar('あそびかた', battleMenu)}
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
    <button class="btn main" id="go">バトルに もどる</button>`, battleMenu);
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
      <p class="note" style="text-align:center"><a href="#" id="rule" style="color:var(--mute)">💡 ルールを見る</a></p>
    </div>`, home);
  $('#rule').onclick = e => { e.preventDefault(); howTo(); };
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
  // アシスト: 実験台のカードのうち「とれば化合物がつくれる」ものを光らせる
  const assist = {}, assist2 = new Set();
  if (mine && G.takes > 0 && S.hints) {
    const have = new Set(can.map(c => c.id)), best = l => l.sort((a, b) => E.pointsFor(G, v, b) - E.pointsFor(G, v, a))[0];
    G.market.forEach((m, i) => { if (!m) return; const nw = E.makeable(p.hand.concat(m)).filter(c => !have.has(c.id)); if (nw.length) assist[i] = best(nw); });
    if (G.takes >= 2) for (let i = 0; i < G.market.length; i++) for (let j = i + 1; j < G.market.length; j++) {
      if (!G.market[i] || !G.market[j]) continue;
      const one = new Set([...E.makeable(p.hand.concat(G.market[i])), ...E.makeable(p.hand.concat(G.market[j]))].map(c => c.id));
      if (E.makeable(p.hand.concat(G.market[i], G.market[j])).some(c => !have.has(c.id) && !one.has(c.id))) { if (!assist[i]) assist2.add(i); if (!assist[j]) assist2.add(j); }
    }
  }
  const nAssist = Object.keys(assist).length;
  let msg;
  if (G.winner !== null) msg = '';
  else if (!myTurn()) msg = `${esc(G.players[G.turn].name)}の ばん…`;
  else if (G.takes > 0) msg = `カードを <b>${G.takes}まい</b> とろう` + (nAssist ? '。<b class="glowtxt">光るカード</b>で つくれるよ' : assist2.size ? '。うすく光る2まいで つくれるよ' : '');
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
      <div class="market">${G.market.map((s, i) => s ? cardHTML(s, assist[i] ? 'hint' : assist2.has(i) ? 'hint2' : '', `data-m="${i}"`, assist[i] ? `<em class="mk">${fml(assist[i].f)}</em>` : '') : '').join('')}<button class="deck" id="deck">山札<br>から</button></div>
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
  if (c.t === 'acid') stAdd('acid'); if (c.t === 'alkali') stAdd('alkali'); if (ev.neutral) stAdd('neutral'); if (ev.combo) stAdd('combo'); if (c.pt >= 13) stAdd('big');
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
  S.coins += coin + bonus; S.games++; if (win && !local) S.wins++; if (win && B.mode === 'cpu' && B.lv === 2) stAdd('w2'); if (B.mode === 'net') stAdd('net'); if (local) stAdd('local'); save();
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
  api.auth = auth; api.FB = FB;
  return api;
})();

// ---------- 記録のクラウド保存(ひなはるコレクトと同じ方式: 自分で決めた「ID」で もどせる。パスワードなし)
// 場所は gensoSaves/<ID>。ID は 2〜12文字(ひらがな・カタカナ・英数字)。大文字・全角は そろえる
const CLOUD = (() => {
  const normId = v => String(v || '').normalize('NFKC').trim().toLowerCase();
  const idOk = id => /^[a-z0-9ぁ-んァ-ヶー_-]{2,12}$/.test(id);
  const u = async id => `${NET.FB.db}/gensoSaves/${encodeURIComponent(id)}.json?auth=${await NET.auth()}`;
  let DEV = null, timer = null, last = 0;
  try { DEV = localStorage.getItem('genso-dev'); if (!DEV) { DEV = Math.random().toString(36).slice(2, 12); localStorage.setItem('genso-dev', DEV); } } catch (e) { DEV = 'x' + Math.random().toString(36).slice(2, 12); }
  const keep = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 同上 */ } };
  const api = { normId, idOk };
  // ID の 中身(データ本体は 読まない)。なければ null
  api.head = async id => { const r = await fetch(await u(id)); if (!r.ok) throw new Error('net'); const d = await r.json(); return d && d.data ? { at: d.at, dev: d.dev || null } : null; };
  // ID の データを読む。なければ null(つかわれていない ID)
  api.load = async id => { const r = await fetch(await u(id)); if (!r.ok) throw new Error('net'); const d = await r.json(); return d && d.data ? JSON.parse(d.data) : null; };
  api.save = async force => {
    if (!S.id) return false;
    try {
      if (!force && S.cloudAt) {
        const h = await api.head(S.id);
        // ID が消された・ほかのスマホが あとから保存した → このスマホは その ID を はなれる
        if (!h || (h.dev !== DEV && h.at > S.cloudAt)) { const old = S.id; S.id = null; S.cloudAt = 0; keep(); toast(`ID「${old}」は ほかのスマホで つかわれたので、このスマホの 自動保存を とめたよ`, 4000); return false; }
      }
      const at = Date.now();
      const r = await fetch(await u(S.id), { method: 'PUT', body: JSON.stringify({ data: JSON.stringify(S), at, dev: DEV }) });
      if (!r.ok) return false;
      S.cloudAt = at; last = at; keep(); return true;
    } catch (e) { return false; }
  };
  // 記録が変わったら、少しまとめてから保存(4秒後。前の保存から20秒は あける)
  api.queue = () => { if (!S.id || timer) return; timer = setTimeout(() => { timer = null; api.save(); }, Math.max(4000, 20000 - (Date.now() - last))); };
  api.adopt = (data, id) => { S = Object.assign(JSON.parse(JSON.stringify(S_DEF)), data, { id, cloudAt: 0 }); keep(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.id) api.save(); });
  return api;
})();
function ask(html, yes) {
  return new Promise(res => {
    const d = document.createElement('div'); d.className = 'ov';
    d.innerHTML = `<div class="box">${html}<div class="acts"><button class="btn main" id="y">${yes}</button><button class="btn" id="n">やめる</button></div></div>`;
    document.body.appendChild(d);
    $('#n', d).onclick = () => { d.remove(); res(false); };
    $('#y', d).onclick = () => { d.remove(); res(true); };
  });
}
function keepScreen(note) {
  const sum = d => `元素 ${Object.keys(d.el || {}).length} / 118・化合物 ${Object.keys(d.cp || {}).length} / ${CP.length}・🧪 ${d.coins | 0}・バトル ${d.wins | 0}勝`;
  screen(`${topBar('きろくの ほぞん', home)}
    <div class="prog" style="text-align:center">${S.id
      ? `<b>☁️ ID「<span data-nofuri>${esc(S.id)}</span>」で ほぞん中</b>
        <span class="note">記録は、あそぶたびに 自動で ネットにも ほぞんされる。<br>アプリのデータが消えても、スマホをかえても、この ID でログインすれば もどせる。</span>
        <span class="note">${S.cloudAt ? 'さいごの ほぞん: ' + new Date(S.cloudAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'まだ ネットに ほぞんできていない'}</span>
        <button class="btn main" id="now">☁️ いま ほぞんする</button>`
      : `<b>まだ この端末の中だけに ほぞんされている</b>
        <span class="note">ID を きめると、ネットにも ほぞんされる。アプリのデータが消えても、スマホをかえても もどせるよ。</span>`}</div>
    <div class="prog"><b>${S.id ? 'べつの ID で ほぞんする' : 'ID を きめて ほぞんする'}</b>
      <input class="txt" id="nid" maxlength="12" placeholder="すきな ID(2〜12文字)" autocomplete="off" autocapitalize="off">
      <span class="note">ひらがな・カタカナ・英数字。パスワードは いらない。ほかの人と 同じ ID は つかえない。</span>
      <button class="btn ${S.id ? '' : 'main'}" id="mkid">この ID で ほぞんする</button></div>
    <div class="prog"><b>ID で ログイン(記録を よみこむ)</b>
      <input class="txt" id="lid" maxlength="12" placeholder="まえに きめた ID" autocomplete="off" autocapitalize="off">
      <button class="btn" id="login">ログイン</button>
      <span class="note">ログインすると、この端末の 今の記録は その ID の記録に 入れかわる。</span></div>
    <p class="note" id="kmsg" style="text-align:center;color:var(--accent)">${note || ''}</p>`, home);
  const msg = t => { $('#kmsg').textContent = t; SE.play('ng'); };
  const now = $('#now'); if (now) now.onclick = async () => { now.disabled = true; const ok = await CLOUD.save(); keepScreen(ok ? '☁️ ほぞんした!' : S.id ? 'ほぞんできなかった(インターネットを たしかめてね)' : ''); };
  $('#mkid').onclick = async () => {
    const id = CLOUD.normId($('#nid').value);
    if (!CLOUD.idOk(id)) return msg('ID は 2〜12文字。ひらがな・カタカナ・英数字で きめてね');
    if (id === S.id) return msg('いま つかっている ID だよ');
    let used; try { used = await CLOUD.load(id); } catch (e) { return msg('インターネットに つながらない'); }
    if (used) {
      if (!await ask(`<b>ID「${esc(id)}」は もう つかわれている</b><p>${sum(used)}</p><p class="note">自分の ID なら「ログイン」の方を つかってね。<br>この記録を 消して、今の記録で 上書きする?</p>`, '上書きする')) return;
      if (!await ask(`<b>ほんとうに 上書きする?</b><p class="note">ID「${esc(id)}」に入っていた記録(${sum(used)})は 消えて、もどせない。</p>`, '消して 上書きする')) return;
    }
    const before = S.id, bAt = S.cloudAt; S.id = id; S.cloudAt = 0;
    if (!await CLOUD.save(true)) { S.id = before; S.cloudAt = bAt; return msg('ほぞんできなかった。もういちど ためしてね'); }
    SE.play('perfect'); keepScreen(`☁️ ID「${id}」で ほぞんした!`);
  };
  $('#login').onclick = async () => {
    const id = CLOUD.normId($('#lid').value);
    if (!CLOUD.idOk(id)) return msg('ID は 2〜12文字。ひらがな・カタカナ・英数字だよ');
    if (id === S.id) return msg('いま つかっている ID だよ');
    let d; try { d = await CLOUD.load(id); } catch (e) { return msg('インターネットに つながらない'); }
    if (!d) return msg(`ID「${id}」の記録は 見つからなかった`);
    if (!await ask(`<b>ID「${esc(id)}」で ログインする?</b><p>${sum(d)}</p><p class="note">この端末の 今の記録(${sum(S)})は 入れかわるよ。${S.id ? '' : '<br>今の記録を のこしたい時は、先に ID を きめて ほぞんしてね。'}</p>`, 'ログインする')) return;
    CLOUD.adopt(d, id); await CLOUD.save(true); SE.play('perfect'); keepScreen('ログインした!');
  };
}
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

// ---------- じっせき(実績)。たっせいすると 🧪 がもらえる
const stAdd = (k, n) => { S.st = S.st || {}; S.st[k] = (S.st[k] || 0) + (n === undefined ? 1 : n); };
const st = k => (S.st && S.st[k]) || 0;
const catOwn = c => EL.filter(e => e.cat === c && S.el[e.n]).length, catAll = c => EL.filter(e => e.cat === c).length;
const ACH = (() => {
  const A = [];
  const add = (g, id, ic, name, desc, v, n, r) => A.push({ g, id, ic, name, desc, v, n, r });
  // バトル
  add('バトル', 'g1', '🎮', 'はじめてのバトル', 'バトルを 1回 さいごまで あそぶ', () => S.games, 1, 10);
  add('バトル', 'w1', '🥉', 'はじめての勝ち', 'バトルで 1回 勝つ', () => S.wins, 1, 10);
  add('バトル', 'w5', '🥈', '5勝', 'バトルで 5回 勝つ', () => S.wins, 5, 20);
  add('バトル', 'w20', '🥇', '20勝', 'バトルで 20回 勝つ', () => S.wins, 20, 40);
  add('バトル', 'w50', '🏆', '50勝', 'バトルで 50回 勝つ', () => S.wins, 50, 80);
  add('バトル', 'w2', '🤖', 'つよいロボに 勝った', '「つよい」の コンピューターに 勝つ', () => st('w2'), 1, 30);
  add('バトル', 'w2b', '🦾', 'ロボはかせ', '「つよい」の コンピューターに 10回 勝つ', () => st('w2'), 10, 60);
  add('バトル', 'net', '📱', 'スマホで たいせん', 'スマホどうしの たいせんを さいごまで あそぶ', () => st('net'), 1, 20);
  add('バトル', 'loc', '🤝', 'かわりばんこ', '1台で ふたりの たいせんを さいごまで あそぶ', () => st('local'), 1, 10);
  // はんのう
  add('はんのう', 'c5', '⚗️', 'じっけん はじめ', '化合物を 5種類 つくる', ownCp, 5, 10);
  add('はんのう', 'c15', '🧫', 'じっけん だいすき', '化合物を 15種類 つくる', ownCp, 15, 20);
  add('はんのう', 'c30', '🔬', 'けんきゅういん', '化合物を 30種類 つくる', ownCp, 30, 40);
  add('はんのう', 'call', '👩‍🔬', '化合物ずかん コンプリート', '化合物を ぜんぶ つくる', ownCp, CP.length, 150);
  add('はんのう', 'n100', '💯', '100回 はんのう', '化合物を あわせて 100回 つくる', () => Object.values(S.cp).reduce((a, b) => a + b, 0), 100, 40);
  add('はんのう', 'acid', '🧪', '酸の つかい手', '酸を 10回 つくる', () => st('acid'), 10, 20);
  add('はんのう', 'alk', '🧼', 'アルカリの つかい手', 'アルカリを 10回 つくる', () => st('alkali'), 10, 20);
  add('はんのう', 'neu1', '⚖️', 'はじめての 中和', '同じターンに 酸とアルカリを つくる', () => st('neutral'), 1, 20);
  add('はんのう', 'neu10', '🌊', '中和マスター', '中和を 10回 きめる', () => st('neutral'), 10, 50);
  add('はんのう', 'combo', '🔥', 'コンボ 10回', '1ターンに 2つ以上つくるのを 10回', () => st('combo'), 10, 20);
  add('はんのう', 'big', '💥', '大きな化合物', '13点より上の 化合物を つくる', () => st('big'), 1, 30);
  // あつめる
  add('あつめる', 'e20', '📗', '元素 20こ', '元素を 20種類 あつめる', ownEl, 20, 10);
  add('あつめる', 'e50', '📘', '元素 50こ', '元素を 50種類 あつめる', ownEl, 50, 30);
  add('あつめる', 'e80', '📙', '元素 80こ', '元素を 80種類 あつめる', ownEl, 80, 60);
  add('あつめる', 'eall', '👑', '周期表 コンプリート', '元素を 118種類 ぜんぶ あつめる', ownEl, 118, 300);
  add('あつめる', 'e1to20', '🔢', '水兵リーベ', '原子番号 1〜20 を ぜんぶ あつめる', () => EL.filter(e => e.n <= 20 && S.el[e.n]).length, 20, 30);
  Object.keys(CAT_COLOR).forEach((c, i) => add('あつめる', 'cat' + i, '🧩', c + ' コンプリート', '「' + c + '」の 元素を ぜんぶ あつめる', () => catOwn(c), catAll(c), catAll(c) >= 15 ? 60 : 30));
  add('あつめる', 'ur1', '🌈', 'はじめての UR', 'ウルトラレアの 元素を 1こ あてる', () => EL.filter(e => e.r === 3 && S.el[e.n]).length, 1, 20);
  add('あつめる', 'ur10', '✨', 'UR ハンター', 'ウルトラレアの 元素を 10種類 あつめる', () => EL.filter(e => e.r === 3 && S.el[e.n]).length, 10, 60);
  add('あつめる', 'p10', '🎁', 'パック 10こ', 'パックを 10こ あける', () => st('pack'), 10, 20);
  add('あつめる', 'p50', '🎉', 'パック 50こ', 'パックを 50こ あける', () => st('pack'), 50, 50);
  add('あつめる', 'p150', '🎊', 'パック 150こ', 'パックを 150こ あける', () => st('pack'), 150, 100);
  // クイズ
  add('クイズ', 'q1', '❓', 'クイズに ちょうせん', 'クイズを 1回 さいごまで やる', () => st('quiz'), 1, 10);
  add('クイズ', 'qp', '🎯', 'まんてん', 'クイズで 10問 ぜんぶ 正解する', () => Object.values(S.quizBest).filter(x => x >= 10).length, 1, 20);
  add('クイズ', 'qall', '🎓', 'ぜんぶ まんてん', '5つの クイズ ぜんぶで まんてんを とる', () => Object.values(S.quizBest).filter(x => x >= 10).length, 5, 100);
  add('クイズ', 'q100', '🧠', '100問 正解', 'クイズで あわせて 100問 正解する', () => st('qok'), 100, 40);
  add('クイズ', 'q500', '📚', '500問 正解', 'クイズで あわせて 500問 正解する', () => st('qok'), 500, 100);
  return A;
})();
const achCount = () => ACH.filter(a => S.ach && S.ach[a.id]).length;
function achCheck() {
  S.ach = S.ach || {}; S.st = S.st || {};
  const got = ACH.filter(a => !S.ach[a.id] && a.v() >= a.n);
  if (!got.length) return;
  let coin = 0; got.forEach(a => { S.ach[a.id] = Date.now(); coin += a.r; }); S.coins += coin;
  const d = document.createElement('div'); d.className = 'achpop';
  d.innerHTML = `<b>🏅 じっせき たっせい!</b><span>${got.length <= 2 ? got.map(a => a.ic + ' ' + esc(a.name)).join('<br>') : got.slice(0, 2).map(a => a.ic + ' ' + esc(a.name)).join('<br>') + '<br>ほか ' + (got.length - 2) + 'こ'}</span><i>🧪 +${coin}</i>`;
  document.body.appendChild(d); setTimeout(() => d.remove(), 3600);
  try { SE.play('perfect'); } catch (e) { /* 音なしでも進む */ }
}
function achScreen() {
  const groups = [...new Set(ACH.map(a => a.g))], n = achCount();
  screen(`${topBar('じっせき', home)}
    <div class="prog"><div class="note">たっせい ${n} / ${ACH.length}</div><div class="bar"><i style="width:${n / ACH.length * 100}%"></i></div>
      <span class="note">たっせいすると 🧪 がもらえる。</span></div>
    ${groups.map(g => `<h3 class="achh">${g}</h3><div class="achl">${ACH.filter(a => a.g === g).map(a => { const ok = S.ach[a.id], v = Math.min(a.n, a.v()); return `<div class="ach ${ok ? 'ok' : ''}"><i>${ok ? a.ic : '🔒'}</i><div><b>${esc(a.name)}</b><span class="note">${esc(a.desc)}</span>${ok ? '' : a.n > 1 ? `<div class="bar"><i style="width:${v / a.n * 100}%"></i></div>` : ''}</div><em>${ok ? '✅' : (a.n > 1 ? v + '/' + a.n + '<br>' : '') + '🧪' + a.r}</em></div>`; }).join('')}</div>`).join('')}`, home);
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
    <dl class="facts"><dt>原子番号</dt><dd>${e.n}</dd><dt>なかま</dt><dd>${esc(e.cat)}</dd>${e.st ? `<dt>ふつうの温度で</dt><dd>${e.st}</dd>` : ''}<dt>レア度</dt><dd><u class="rty r${e.r}" data-nofuri>${RTAG[e.r]}</u> ${RARE[e.r]}</dd><dt>出るところ</dt><dd>${IN_DECK[e.sym] ? 'バトルとパック' : 'パックだけ'}</dd><dt>もっている数</dt><dd>${own}まい</dd></dl>
    ${uses.length ? `<div class="chips">${uses.map(c => `<span class="chip near" style="color:var(--ink)">${c.em} ${fml(c.f)} ${esc(c.ja)}</span>`).join('')}</div>` : ''}`
    : `<p class="note">まだ もっていない元素。原子番号 ${e.n}・${esc(e.cat)}。<br>${IN_DECK[e.sym] ? 'バトルで この元素を使って 化合物をつくるか、パックで あてると 見られるよ。' : 'バトルには出てこない元素。パックで あてると 見られるよ。'}</p>`}
    <button class="btn main">とじる</button></div>`;
  document.body.appendChild(d); SE.play('select');
  d.onclick = ev => { if (ev.target === d || ev.target.closest('.btn')) d.remove(); };
}

// ---------- パック
const PACK_COST = 30;
const DECK_KINDS = Object.keys(IN_DECK).length;
function packScreen(result) {
  const left = result ? result.filter(r => !r.open).length : 0;
  screen(`${topBar('パック', home)}
    <div class="prog" style="text-align:center"><b>元素パック</b>
      <span class="note" id="pmsg">${result ? (left ? `カードを タップして めくろう(あと ${left}まい)` : result.map(r => `${esc(r.e.ja)}(${RARE[r.e.r]})`).join('・')) : '元素カードが3まい出る。めずらしい元素ほど出にくい。同じカードが出たら 🧪3 にかわる。'}</span>
      <div class="pack" id="pk">${result ? result.map((r, i) => `<span class="flip ${r.open ? 'open done' : ''}" data-i="${i}"><span class="in"><span class="face bk"><b>⚗️</b><small>げんそラボ</small></span><span class="face fr">${cardHTML(r.e.sym, 'big rare' + r.e.r)}</span></span>${r.open && r.isNew ? '<span class="newtag">NEW!</span>' : ''}</span>`).join('') : '<div style="font-size:90px">🎁</div>'}</div>
      <div class="rlegend" data-nofuri><span><u class="rty r0">N</u> ノーマル</span><span><u class="rty r1">R</u> レア</span><span><u class="rty r2">SR</u> スーパーレア</span><span><u class="rty r3">UR</u> ウルトラレア</span></div>
      ${left ? '' : `<button class="btn main" id="open" ${S.coins < PACK_COST ? 'disabled' : ''}>🧪${PACK_COST}で ${result ? 'もう1パック' : 'あける'}</button>`}
      ${!left && S.coins < PACK_COST ? '<p class="note">🧪が たりない。バトルやクイズで ためよう。</p>' : ''}</div>
    <div class="prog"><span class="note">バトルの山札に入っているのは ${DECK_KINDS}種類だけ。のこりの ${118 - DECK_KINDS}種類は、パックでしか 出会えない。</span>
      <div class="note">元素ずかん ${ownEl()} / 118</div><div class="bar"><i style="width:${ownEl() / 118 * 100}%"></i></div></div>`, home);
  const op = $('#open');
  if (op) op.onclick = () => {
    if (S.coins < PACK_COST) return;
    S.coins -= PACK_COST;
    const W = [10, 6, 3, 1], pool = []; EL.forEach(e => { for (let i = 0; i < W[e.r]; i++) pool.push(e); });
    const res = [];
    for (let i = 0; i < 3; i++) { const e = pick(pool); const isNew = !S.el[e.n]; S.el[e.n] = (S.el[e.n] || 0) + 1; if (!isNew) S.coins += 3; res.push({ e, isNew, open: false }); }
    stAdd('pack'); save(); FX.shake(); const pk = $('#pk'); if (pk) pk.classList.add('shaking'); op.disabled = true;
    setTimeout(() => packScreen(res), 520);
  };
  app.querySelectorAll('.flip').forEach(fl => fl.onclick = () => {
    const r = result[+fl.dataset.i];
    if (r.open) { if (fl.classList.contains('done')) elDetail(r.e.n); return; }
    r.open = true; fl.classList.add('open'); FX.card(0, r.e.r);
    if (r.e.r >= 3) confetti();
    setTimeout(() => {
      if (result.every(x => x.open)) return packScreen(result);
      fl.classList.add('done');
      if (r.isNew) fl.insertAdjacentHTML('beforeend', '<span class="newtag">NEW!</span>');
      const m = $('#pmsg'); if (m) m.textContent = `カードを タップして めくろう(あと ${result.filter(x => !x.open).length}まい)`;
    }, 650);
  });
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
  S.coins += coin; S.quizBest[Q.set.k] = Math.max(S.quizBest[Q.set.k] || 0, Q.ok); stAdd('qok', Q.ok); stAdd('quiz'); save();
  SE.play(Q.ok === 10 ? 'perfect' : 'result');
  screen(`<div class="hero"><div class="atoms">${Q.ok === 10 ? '🎉' : Q.ok >= 7 ? '😊' : '💪'}</div><h1 style="font-size:30px">${Q.ok} / 10</h1><p>🧪 +${coin}</p></div>
    <div class="acts"><button class="btn main" id="again">もういちど</button><button class="btn" id="hm">ホーム</button></div>`);
  $('#again').onclick = () => startQuiz(Q.set); $('#hm').onclick = home;
}

home();
if (S.id) CLOUD.save();
// テスト用
window.GL = { get S() { return S; }, get B() { return B; }, save, home, startBattle, E, NET, CLOUD };

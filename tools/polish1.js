// 1回だけ使う書きかえ: 効果音・背景・はんのうの演出・通信の受け取りを直す
const fs = require('fs'), path = require('path');
const M = path.join(__dirname, '../src/main.js'), H = path.join(__dirname, '../app/index.html');
let s = fs.readFileSync(M, 'utf8'), h = fs.readFileSync(H, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('miss: ' + a.slice(0, 50)); s = s.replace(a, b); };

// ---- ゲーム専用の効果音(Web Audio 合成)
rep(`// ---------- 記録(この端末に保存)`, `// ---------- このゲーム専用の効果音(泡・はんのう・酸・パックなど)。音あり/なしは共通の SE に合わせる
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
  bg.innerHTML = syms.map((t, i) => \`<span style="left:\${(i * 8.3 + 3) % 96}%;animation-duration:\${16 + (i * 7) % 14}s;animation-delay:-\${(i * 5) % 20}s;--s:\${26 + (i * 11) % 30}px" data-nofuri>\${t}</span>\`).join('');
  document.body.prepend(bg);
})();

// ---------- 記録(この端末に保存)`);

// ---- 音の差しかえ
rep(`SE.play('land'); B.sel = []; pushNet(); drawBattle();
  const cards`, `FX.take(); B.sel = []; pushNet(); drawBattle();
  const cards`);
rep(`B.sel = B.sel.includes(i) ? B.sel.filter(x => x !== i) : B.sel.concat(i); SE.play('select'); drawBattle();`, `B.sel = B.sel.includes(i) ? B.sel.filter(x => x !== i) : B.sel.concat(i); FX.pick(); drawBattle();`);
rep(`    SE.play(ev.neutral || c.pt >= 8 ? 'perfect' : ev.effect && ev.effect.kind === 'acid' && !mine ? 'ng' : 'ok');`,
  `    FX.react(c.pt >= 8);
    if (ev.effect && ev.effect.kind === 'acid') setTimeout(FX.acid, 700);
    if (ev.effect && ev.effect.kind === 'alkali') setTimeout(FX.alkali, 700);
    if (ev.neutral) setTimeout(FX.neutral, 1100);
    if (ev.effect && ev.effect.kind === 'acid') { d.querySelector('.box').classList.add('acidhit'); }`);
rep(`    SE.play('land'); drawBattle(); await sleep(1000);`, `    FX.take(); drawBattle(); await sleep(1000);`);
rep(`E.endTurn(G); B.busy = false; SE.play('select'); drawBattle();
}`, `E.endTurn(G); B.busy = false; drawBattle(); yourTurn();
}`);
rep(`  SE.play(win ? 'clear' : 'over');`, `  win ? FX.win() : FX.lose(); if (win) confetti();`);
rep(`    save(); SE.play(res.some(r => r.e.r >= 2) ? 'perfect' : 'star'); packScreen(res);`, `    save(); FX.shake(); const pk = $('#pk'); if (pk) pk.classList.add('shaking');
    setTimeout(() => { res.forEach((r, i) => FX.card(i, r.e.r)); packScreen(res); }, 520);`);
rep(`else if (G.last && G.last.type === 'end' && G.turn === B.me) { SE.play('start'); toast('あなたの ばん!'); }`, `else if (G.last && G.last.type === 'end' && G.turn === B.me) yourTurn();`);

// ---- 「あなたの ばん!」の帯と、紙ふぶき
rep(`function handoff() {`, `function yourTurn() {
  FX.turn();
  const d = document.createElement('div'); d.className = 'banner'; d.textContent = 'あなたの ばん!'; document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
}
function confetti() {
  const d = document.createElement('div'); d.className = 'confetti'; d.setAttribute('aria-hidden', 'true');
  const cols = Object.values(CAT_COLOR);
  d.innerHTML = Array.from({ length: 36 }, (_, i) => \`<i style="left:\${rnd(100)}%;background:\${cols[i % cols.length]};animation-delay:\${(i % 12) * 0.08}s;animation-duration:\${1.6 + (i % 5) * 0.3}s"></i>\`).join('');
  document.body.appendChild(d); setTimeout(() => d.remove(), 3600);
}
function handoff() {`);

// ---- はんのうの演出: 原子が集まってから、できたものが出る
rep(`    const atoms = Object.entries(c.p).map(([s, n]) => Array(n).fill(\`<span class="atom" style="--c:\${CAT_COLOR[bySym[s].cat]}" data-nofuri>\${s}</span>\`).join('')).join('');`,
  `    let ai = 0; const total = c.size;
    const atoms = Object.entries(c.p).map(([s, n]) => Array.from({ length: n }, () => { const a = (ai++ / total) * Math.PI * 2; return \`<span class="atom fly" style="--c:\${CAT_COLOR[bySym[s].cat]};--dx:\${Math.round(Math.cos(a) * 120)}px;--dy:\${Math.round(Math.sin(a) * 90)}px" data-nofuri>\${s}</span>\`; }).join('')).join('');`);
rep(`<div class="em">\${c.em}</div><div class="f">\${fml(c.f)}</div>`, `<div class="em born">\${c.em}</div><div class="f">\${fml(c.f)}</div>`);

// ---- ヒントの「あと1まい」は2つまで(手ふだが画面の外に出ないように)
rep(`.slice(0, 4).map(x => \`<span class="chip near">`, `.slice(0, 2).map(x => \`<span class="chip near">`);

// ---- 通信の受け取りを整理
rep(`    const on = e => {
      let d; try { d = JSON.parse(e.data); } catch (x) { return; }
      if (!d) return;
      if (d.path === '/') room = d.data; else { room = room || {}; const k = d.path.slice(1).split('/')[0]; if (e.type === 'patch' && d.path === '/') Object.assign(room, d.data); else room[k] = d.data; }
      if (api.onRoom) api.onRoom(room || {});
    };
    es.addEventListener('put', on); es.addEventListener('patch', e => { let d; try { d = JSON.parse(e.data); } catch (x) { return; } room = Object.assign(room || {}, d.path === '/' ? d.data : { [d.path.slice(1)]: d.data }); if (api.onRoom) api.onRoom(room); });`,
  `    const on = e => {
      let d; try { d = JSON.parse(e.data); } catch (x) { return; }
      if (!d) return;
      if (d.path === '/') room = e.type === 'patch' ? Object.assign(room || {}, d.data) : d.data;
      else { room = room || {}; room[d.path.slice(1).split('/')[0]] = d.data; }
      if (room === null) { if (api.onGone) api.onGone(); return; }
      if (api.onRoom) api.onRoom(room);
    };
    es.addEventListener('put', on); es.addEventListener('patch', on);`);
rep(`const api = { code: null, host: false, onRoom: null };`, `const api = { code: null, host: false, onRoom: null, onGone: null };`);
rep(`      NET.onRoom = onRoom;`, `      NET.onRoom = onRoom; NET.onGone = () => { if (!NET.host && NET.code) { toast('あいてが へやを とじたよ', 2500); B = null; NET.leave(); battleMenu(); } };`);
fs.writeFileSync(M, s);

// ---- CSS
const css = `
/* 背景: 上がっていく元素の泡 */
.bgfx{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background:
  radial-gradient(900px 500px at 80% 110%,#3b2a7a55 0,transparent 60%),
  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='98'%3E%3Cpath d='M28 0l28 16v33L28 65 0 49V16z M28 98V65 M0 49v33 M56 49v33' fill='none' stroke='%23ffffff' stroke-opacity='.035' stroke-width='1.5'/%3E%3C/svg%3E")}
.bgfx span{position:absolute;bottom:-70px;width:var(--s);height:var(--s);border-radius:50%;display:grid;place-items:center;font-family:var(--fn);font-weight:800;font-size:calc(var(--s)*.42);color:#ffffff30;border:1.5px solid #ffffff22;background:radial-gradient(circle at 30% 30%,#ffffff22,#ffffff05 60%);animation:rise linear infinite}
@keyframes rise{from{transform:translate(0,0)}50%{transform:translate(14px,-55vh)}to{transform:translate(-8px,-115vh)}}
/* はんのうの演出 */
.atom.fly{animation:join .55s cubic-bezier(.5,0,.3,1.4) both}
@keyframes join{from{transform:translate(var(--dx),var(--dy)) scale(.6);opacity:0}60%{opacity:1}to{transform:none}}
.ov .em.born{animation:born .5s .45s both}
@keyframes born{0%{transform:scale(0) rotate(-30deg);opacity:0;filter:brightness(3)}70%{transform:scale(1.25) rotate(6deg);filter:brightness(1.4)}100%{transform:none;opacity:1;filter:none}}
.ov .box{position:relative;overflow:hidden}
.ov .box::before{content:"";position:absolute;left:50%;top:38%;width:20px;height:20px;border-radius:50%;border:3px solid #fff;opacity:0;transform:translate(-50%,-50%);animation:ring .7s .45s}
@keyframes ring{from{opacity:.9;width:20px;height:20px}to{opacity:0;width:420px;height:420px}}
.ov .box.acidhit{animation:pop .3s,shakeX .4s .7s}
@keyframes shakeX{20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.ov .pt{animation:born .4s .7s both}
/* あなたの ばん! */
.banner{position:fixed;left:0;right:0;top:38%;z-index:55;text-align:center;font-weight:900;font-size:30px;padding:14px 0;color:var(--accent-ink);background:linear-gradient(90deg,transparent,var(--accent) 20%,var(--accent) 80%,transparent);animation:slide 1.1s both;pointer-events:none}
@keyframes slide{0%{transform:translateX(-100%)}20%,80%{transform:none}100%{transform:translateX(100%)}}
.confetti{position:fixed;inset:0;z-index:70;pointer-events:none;overflow:hidden}
.confetti i{position:absolute;top:-14px;width:9px;height:14px;border-radius:2px;animation:fall linear both}
@keyframes fall{to{transform:translateY(110vh) rotate(720deg)}}
/* 手ざわり */
.card{transition:transform .12s}
.market .card:active,.hand .card:active,.deck:active{transform:scale(.94)}
.who.turn{animation:glow 1.6s infinite alternate}
@keyframes glow{to{box-shadow:0 0 0 2px var(--accent),0 0 16px #ffd23f88}}
.chip[data-make]{animation:pop .25s}
.pack.shaking>div{animation:shakeX .5s}
.table{background:linear-gradient(180deg,#0c1638,#081029);box-shadow:inset 0 2px 12px #0008}
.hero .atoms{animation:floaty 3s ease-in-out infinite alternate;display:inline-block}
@keyframes floaty{to{transform:translateY(-8px) rotate(6deg)}}
.menu .btn.wide{box-shadow:0 4px 0 #b86a00,0 8px 24px #ff9f4355}
</style>`;
if (!h.includes('.bgfx')) h = h.replace('</style>', css);
h = h.replace('body{background:radial-gradient(1200px 600px at 50% -10%,#2a3f8f 0,var(--bg) 60%) fixed,var(--bg);', 'body{background:radial-gradient(1200px 600px at 50% -10%,#2a3f8f 0,var(--bg) 60%) fixed,var(--bg);position:relative;z-index:0;');
fs.writeFileSync(H, h);
console.log('polished');

// 一度だけ使った書きかえ(2026-11-14): 実験台のアシスト / パックをめくる / レア度のしるし。もう実行しない。
const fs = require('fs'), path = require('path');
let f = path.join(__dirname, '../src/main.js'); let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 60)); s = s.replace(a, () => b); };
// ---- 実験台のアシスト
rep("  const needSyms = new Set(near.map(x => x.need));",
`  // アシスト: 実験台のカードのうち「とれば化合物がつくれる」ものを光らせる
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
  const nAssist = Object.keys(assist).length;`);
rep("  else if (G.takes > 0) msg = `カードを <b>${G.takes}まい</b> とろう`;",
  "  else if (G.takes > 0) msg = `カードを <b>${G.takes}まい</b> とろう` + (nAssist ? '。<b class=\"glowtxt\">光っているカード</b>をとると つくれるよ' : assist2.size ? '。うすく光る2まいを とると つくれるよ' : '');");
rep("${G.market.map((s, i) => s ? cardHTML(s, mine && G.takes > 0 && S.hints && needSyms.has(s) ? 'hint' : '', `data-m=\"${i}\"`) : '').join('')}",
  "${G.market.map((s, i) => s ? cardHTML(s, assist[i] ? 'hint' : assist2.has(i) ? 'hint2' : '', `data-m=\"${i}\"`, assist[i] ? `<em class=\"mk\">${fml(assist[i].f)}</em>` : '') : '').join('')}");
// ---- パック: 裏向き3まいを タップでめくる
const a = s.indexOf("const PACK_COST = 30;"), b = s.indexOf("// ---------- クイズ");
if (a < 0 || b < 0) throw new Error('pack block');
s = s.slice(0, a) + `const PACK_COST = 30;
const DECK_KINDS = Object.keys(IN_DECK).length;
function packScreen(result) {
  const left = result ? result.filter(r => !r.open).length : 0;
  screen(\`\${topBar('パック', home)}
    <div class="prog" style="text-align:center"><b>元素パック</b>
      <span class="note" id="pmsg">\${result ? (left ? \`カードを タップして めくろう(あと \${left}まい)\` : result.map(r => \`\${esc(r.e.ja)}(\${RARE[r.e.r]})\`).join('・')) : '元素カードが3まい出る。めずらしい元素ほど出にくい。同じカードが出たら 🧪3 にかわる。'}</span>
      <div class="pack" id="pk">\${result ? result.map((r, i) => \`<span class="flip \${r.open ? 'open done' : ''}" data-i="\${i}"><span class="in"><span class="face bk"><b>⚗️</b><small>げんそラボ</small></span><span class="face fr">\${cardHTML(r.e.sym, 'big rare' + r.e.r)}</span></span>\${r.open && r.isNew ? '<span class="newtag">NEW!</span>' : ''}</span>\`).join('') : '<div style="font-size:90px">🎁</div>'}</div>
      <div class="rlegend" data-nofuri><span><u class="rb r0">N</u> ノーマル</span><span><u class="rb r1">R</u> レア</span><span><u class="rb r2">SR</u> スーパーレア</span><span><u class="rb r3">UR</u> ウルトラレア</span></div>
      \${left ? '' : \`<button class="btn main" id="open" \${S.coins < PACK_COST ? 'disabled' : ''}>🧪\${PACK_COST}で \${result ? 'もう1パック' : 'あける'}</button>\`}
      \${!left && S.coins < PACK_COST ? '<p class="note">🧪が たりない。バトルやクイズで ためよう。</p>' : ''}</div>
    <div class="prog"><span class="note">バトルの山札に入っているのは \${DECK_KINDS}種類だけ。のこりの \${118 - DECK_KINDS}種類は、パックでしか 出会えない。</span>
      <div class="note">元素ずかん \${ownEl()} / 118</div><div class="bar"><i style="width:\${ownEl() / 118 * 100}%"></i></div></div>\`, home);
  const op = $('#open');
  if (op) op.onclick = () => {
    if (S.coins < PACK_COST) return;
    S.coins -= PACK_COST;
    const W = [10, 6, 3, 1], pool = []; EL.forEach(e => { for (let i = 0; i < W[e.r]; i++) pool.push(e); });
    const res = [];
    for (let i = 0; i < 3; i++) { const e = pick(pool); const isNew = !S.el[e.n]; S.el[e.n] = (S.el[e.n] || 0) + 1; if (!isNew) S.coins += 3; res.push({ e, isNew, open: false }); }
    save(); FX.shake(); const pk = $('#pk'); if (pk) pk.classList.add('shaking'); op.disabled = true;
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
      const m = $('#pmsg'); if (m) m.textContent = \`カードを タップして めくろう(あと \${result.filter(x => !x.open).length}まい)\`;
    }, 650);
  });
}

` + s.slice(b);
// ずかんの くわしい画面: レア度のしるしと、どこで出るか
rep("<dt>レア度</dt><dd>${RARE[e.r]}</dd>", "<dt>レア度</dt><dd><u class=\"rb r${e.r}\" data-nofuri>${RTAG[e.r]}</u> ${RARE[e.r]}</dd><dt>出るところ</dt><dd>${IN_DECK[e.sym] ? 'バトルとパック' : 'パックだけ'}</dd>");
rep("<br>パックで あてるか、バトルで使うと 見られるよ。", "<br>${IN_DECK[e.sym] ? 'バトルで この元素を使って 化合物をつくるか、パックで あてると 見られるよ。' : 'バトルには出てこない元素。パックで あてると 見られるよ。'}");
fs.writeFileSync(f, s);
// ---- CSS
f = path.join(__dirname, '../app/index.html'); s = fs.readFileSync(f, 'utf8');
rep(".rare1{box-shadow:0 0 0 3px #7fd6ff,0 0 14px #7fd6ff}.rare2{box-shadow:0 0 0 3px #ffd23f,0 0 18px #ffd23f}.rare3{box-shadow:0 0 0 3px #ff7ad9,0 0 24px #ff7ad9;animation:pop .35s,shine 1.2s infinite alternate}",
`.rare1{box-shadow:0 0 0 3px #7fd6ff,0 0 14px #7fd6ff}.rare2{box-shadow:0 0 0 3px #ffd23f,0 0 20px #ffd23f}.rare3{animation:holo 2.4s linear infinite}
@keyframes holo{0%,100%{box-shadow:0 0 0 3px #ff7ad9,0 0 26px #ff7ad9}33%{box-shadow:0 0 0 3px #ffd23f,0 0 30px #ffd23f}66%{box-shadow:0 0 0 3px #7fd6ff,0 0 30px #7fd6ff}}
/* 光のすじ(R以上)。カードの上を ななめに通る */
.rare1::after,.rare2::after,.rare3::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 35%,#fff9 50%,transparent 65%);background-size:260% 100%;animation:sweep 2.8s ease-in-out infinite}
.rare2::after{animation-duration:2s}
.rare3::after{background-image:linear-gradient(115deg,transparent 25%,#ff7ad988 40%,#fff 50%,#7fd6ff88 60%,transparent 75%);animation-duration:1.5s}
@keyframes sweep{0%,35%{background-position:130% 0}100%{background-position:-130% 0}}
/* レア度のしるし */
.rb{position:absolute;right:2px;top:2px;z-index:2;text-decoration:none;font:800 8px/1 var(--fn);padding:2px 3px;border-radius:4px;color:#fff;background:#5b6577;letter-spacing:.02em;box-shadow:0 0 0 1px #0005}
.rb.r1{background:#1e88e5}.rb.r2{background:linear-gradient(135deg,#ffb300,#ff7a00);color:#201000}.rb.r3{background:linear-gradient(135deg,#ff4fb6,#7c4dff,#22c1ff)}
.big.card .rb{font-size:13px;padding:3px 6px;right:5px;top:5px;border-radius:6px}
dd .rb,.rlegend .rb{position:static;display:inline-block;font-size:11px;padding:2px 5px;vertical-align:middle}
.rlegend{font-size:11px;color:var(--mute);display:flex;gap:4px 10px;justify-content:center;flex-wrap:wrap;align-items:center;font-family:var(--f)}
/* めくる */
.flip{position:relative;width:96px;height:136px;perspective:700px;cursor:pointer;animation:pop .35s both}
.flip:nth-child(2){animation-delay:.1s}.flip:nth-child(3){animation-delay:.2s}
.flip .in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .6s cubic-bezier(.3,1.4,.5,1)}
.flip.open .in{transform:rotateY(180deg)}
.flip .face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:14px}
.flip .fr{transform:rotateY(180deg)}
.flip .bk{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:radial-gradient(circle at 50% 35%,#4a66d0,#1a2760 70%);border:3px solid #ffd23f;box-shadow:0 3px 0 #0008;color:#ffd23f;font-family:var(--fn)}
.flip .bk b{font-size:40px}.flip .bk small{font-size:11px;font-weight:800}
.flip:not(.open) .bk{animation:wob 1.4s ease-in-out infinite alternate}
.flip:not(.open):nth-child(2) .bk{animation-delay:.3s}.flip:not(.open):nth-child(3) .bk{animation-delay:.6s}
@keyframes wob{from{transform:rotate(-2deg)}to{transform:rotate(2deg) translateY(-3px)}}
.kcode{font:800 34px/1.3 var(--fn);letter-spacing:.08em;color:var(--accent);background:#0006;border-radius:12px;padding:8px 6px;user-select:all}
/* 実験台のアシスト */
.card.hint{animation:hintp 1s ease-in-out infinite alternate;z-index:1}
@keyframes hintp{from{box-shadow:0 0 0 3px #ffe04d,0 0 8px #ffe04d}to{box-shadow:0 0 0 3px #fff3a0,0 0 22px 4px #ffd23f;transform:translateY(-4px)}}
.card.hint2{box-shadow:0 0 0 2px #7fd6ffaa,0 0 10px #7fd6ff88}
.card .mk{position:absolute;left:0;right:0;bottom:0;font:800 10px/1.5 var(--fn);font-style:normal;background:#ffe04d;color:#221a00;text-align:center}
.card .mk sub{font-size:.75em}
.glowtxt{color:#ffe04d;text-shadow:0 0 8px #ffd23f}`);
rep(".card.hint{box-shadow:0 0 0 3px var(--good),0 0 12px var(--good)}\n", "");
fs.writeFileSync(f, s); console.log('ok');

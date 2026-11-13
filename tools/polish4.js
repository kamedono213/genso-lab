// 一度だけ使った書きかえ(2026-11-14): じっせき(実績)を足し、ホームの「あそびかた」と入れかえる。もう実行しない。
const fs = require('fs'), path = require('path');
let f = path.join(__dirname, '../src/main.js'); let s = fs.readFileSync(f, 'utf8');
const rep = (x, y) => { if (!s.includes(x)) throw new Error('missing: ' + x.slice(0, 60)); s = s.replace(x, () => y); };
rep("name: '', hints: true, lv: 0, miss: {}, quizBest: {} };", "name: '', hints: true, lv: 0, miss: {}, quizBest: {}, st: {}, ach: {} };");
rep("const save = () => { S.t = Date.now();", "const save = () => { S.t = Date.now(); achCheck();");
rep(`      <button class="btn" data-go="how"><i>💡</i>あそびかた<small>ルールを見る</small></button>`,
  "      <button class=\"btn\" data-go=\"ach\"><i>🏅</i>じっせき<small>${achCount()} / ${ACH.length} たっせい</small></button>");
rep("quiz: quizMenu, how: howTo })", "quiz: quizMenu, ach: achScreen })");
rep("function howTo() {\n  screen(`${topBar('あそびかた', home)}", "function howTo() {\n  screen(`${topBar('あそびかた', battleMenu)}");
rep("    <button class=\"btn main\" id=\"go\">バトルを はじめる</button>`, home);", "    <button class=\"btn main\" id=\"go\">バトルに もどる</button>`, battleMenu);");
// バトルメニューから ルールを見られるようにしておく
rep("    </div>`, home);\n  app.querySelectorAll('#lv button')", "      <p class=\"note\" style=\"text-align:center\"><a href=\"#\" id=\"rule\" style=\"color:var(--mute)\">💡 ルールを見る</a></p>\n    </div>`, home);\n  $('#rule').onclick = e => { e.preventDefault(); howTo(); };\n  app.querySelectorAll('#lv button')");
// 数える
rep("  S.cp[c.id] = (S.cp[c.id] || 0) + 1;\n", "  S.cp[c.id] = (S.cp[c.id] || 0) + 1;\n  if (c.t === 'acid') stAdd('acid'); if (c.t === 'alkali') stAdd('alkali'); if (ev.neutral) stAdd('neutral'); if (ev.combo) stAdd('combo'); if (c.pt >= 13) stAdd('big');\n");
rep("S.games++; if (win && !local) S.wins++; save();", "S.games++; if (win && !local) S.wins++; if (win && B.mode === 'cpu' && B.lv === 2) stAdd('w2'); if (B.mode === 'net') stAdd('net'); if (local) stAdd('local'); save();");
rep("    save(); FX.shake(); const pk = $('#pk');", "    stAdd('pack'); save(); FX.shake(); const pk = $('#pk');");
rep("S.quizBest[Q.set.k] = Math.max(S.quizBest[Q.set.k] || 0, Q.ok); save();", "S.quizBest[Q.set.k] = Math.max(S.quizBest[Q.set.k] || 0, Q.ok); stAdd('qok', Q.ok); stAdd('quiz'); save();");
// じっせき本体(ずかんの前に入れる)
rep("// ---------- ずかん\n", `// ---------- じっせき(実績)。たっせいすると 🧪 がもらえる
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
  d.innerHTML = \`<b>🏅 じっせき たっせい!</b><span>\${got.length <= 2 ? got.map(a => a.ic + ' ' + esc(a.name)).join('<br>') : got.slice(0, 2).map(a => a.ic + ' ' + esc(a.name)).join('<br>') + '<br>ほか ' + (got.length - 2) + 'こ'}</span><i>🧪 +\${coin}</i>\`;
  document.body.appendChild(d); setTimeout(() => d.remove(), 3600);
  try { SE.play('perfect'); } catch (e) { /* 音なしでも進む */ }
}
function achScreen() {
  const groups = [...new Set(ACH.map(a => a.g))], n = achCount();
  screen(\`\${topBar('じっせき', home)}
    <div class="prog"><div class="note">たっせい \${n} / \${ACH.length}</div><div class="bar"><i style="width:\${n / ACH.length * 100}%"></i></div>
      <span class="note">たっせいすると 🧪 がもらえる。</span></div>
    \${groups.map(g => \`<h3 class="achh">\${g}</h3><div class="achl">\${ACH.filter(a => a.g === g).map(a => { const ok = S.ach[a.id], v = Math.min(a.n, a.v()); return \`<div class="ach \${ok ? 'ok' : ''}"><i>\${ok ? a.ic : '🔒'}</i><div><b>\${esc(a.name)}</b><span class="note">\${esc(a.desc)}</span>\${ok ? '' : a.n > 1 ? \`<div class="bar"><i style="width:\${v / a.n * 100}%"></i></div>\` : ''}</div><em>\${ok ? '✅' : (a.n > 1 ? v + '/' + a.n + '<br>' : '') + '🧪' + a.r}</em></div>\`; }).join('')}</div>\`).join('')}\`, home);
}

// ---------- ずかん
`);
fs.writeFileSync(f, s);
f = path.join(__dirname, '../app/index.html'); s = fs.readFileSync(f, 'utf8');
rep("/* めくる */", `/* じっせき */
.achh{margin:14px 4px 6px;font-size:14px;color:var(--accent)}
.achl{display:flex;flex-direction:column;gap:6px}
.ach{display:flex;align-items:center;gap:10px;background:#ffffff0d;border-radius:14px;padding:8px 10px;opacity:.75}
.ach.ok{opacity:1;background:linear-gradient(90deg,#ffd23f2e,#ffffff0d);box-shadow:inset 0 0 0 1.5px #ffd23f88}
.ach>i{font-style:normal;font-size:26px;width:34px;text-align:center;flex:none}
.ach>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.ach b{font-size:14px}.ach .bar{height:6px}
.ach>em{font-style:normal;font:800 11px/1.4 var(--fn);text-align:right;color:var(--mute);flex:none}
.achpop{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:90;background:linear-gradient(135deg,#ffb300,#ff7a00);color:#201000;border-radius:16px;padding:10px 18px;text-align:center;font-family:var(--f);box-shadow:0 6px 24px #000a;display:flex;flex-direction:column;gap:2px;min-width:220px;animation:achin 3.6s both;pointer-events:none}
.achpop b{font-size:15px}.achpop span{font-size:13px;font-weight:700}.achpop i{font-style:normal;font-weight:800}
@keyframes achin{0%{transform:translate(-50%,-140%)}8%,88%{transform:translate(-50%,0)}100%{transform:translate(-50%,-140%)}}
/* めくる */`);
fs.writeFileSync(f, s); console.log('ok');

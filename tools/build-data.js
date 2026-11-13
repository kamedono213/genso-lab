// 元素のデータ(app/data/elements.js)を作る。
// もとは なかまドリルの元素くん118(名前・なかま・ひとこと・状態)。ここで「身近なものの絵文字」とレア度を足す。
// 実行: node tools/build-data.js
const fs = require('fs'), path = require('path');
const EL = require('./elements-base.json');
// 身近な使い道・由来を表す絵文字(原子番号順)。古いスマホで出ない新しい絵文字は使わない
const EMOJI = ('💧 🎈 🔋 💚 🧫 💎 🌬️ 🌿 🍳 🌃 🧂 🎆 🥫 💻 🌱 🌋 🏊 🌫️ 🍌 🦴 ' +
  '🚲 ✈️ 🔧 🚿 🔋 🧲 🔵 💰 🔌 🔩 🖐️ 📡 ☠️ 🖨️ 🎞️ 🔦 ⏱️ 🎇 📺 🔪 ' +
  '🚄 ⚙️ 🏥 🖊️ 🚗 🦷 🥈 🎨 📱 🤖 🧯 💿 🧴 🚘 ⏰ 🥛 🔭 🔥 🥽 🎧 ' +
  '☢️ 🎸 💶 🧠 🟢 🚙 🔬 🌐 🩺 ⏲️ 🔎 🛑 🎮 💡 🚀 🖋️ ☄️ 💍 🥇 🌡️ ' +
  '🐀 🎣 🌈 ☢️ ❓ ♨️ 🇫🇷 ⌚ ☢️ ⚡ ☢️ ⚛️ 🪐 🛰️ 🚨 👩‍🔬 🏫 🌉 🧮 👨‍🔬 ' +
  '📋 🏅 🌀 ⚛️ 🏙️ 👨‍🔬 ⚛️ 🏰 👩‍🔬 🏙️ 📷 ☀️ 🇯🇵 🧪 🏛️ 🔬 🤠 👴').split(/\s+/);
if (EMOJI.length !== 118) throw new Error('emoji ' + EMOJI.length);
// バトルに出てくる元素
const BATTLE = 'H O C N Cl Na S Ca Fe Cu Mg K Al Si Zn Ag Au He Ne Ar F I Ti Pt U'.split(' ');
// 周期表の位置(族 1-18、周期 1-7。ランタノイド=周期8、アクチノイド=周期9 として下に並べる)
function pos(n) {
  const rows = [[1, 2], [3, 10], [11, 18], [19, 36], [37, 54], [55, 86], [87, 118]];
  if (n >= 57 && n <= 71) return [n - 57 + 3, 8];
  if (n >= 89 && n <= 103) return [n - 89 + 3, 9];
  const p = rows.findIndex(r => n >= r[0] && n <= r[1]) + 1, a = rows[p - 1][0], i = n - a;
  if (p === 1) return [n === 1 ? 1 : 18, 1];
  if (p <= 3) return [i < 2 ? i + 1 : i + 11, p];
  if (p <= 5) return [i + 1, p];
  return [i < 2 ? i + 1 : i - 14 + 1, p]; // 6・7周期: 3族の場所はランタノイド/アクチノイドに
}
const out = EL.map((e, i) => {
  let r = e.n <= 20 || BATTLE.includes(e.sym) ? 0 : e.n <= 56 ? 1 : e.n <= 92 ? 2 : 3;
  if (['Au', 'Pt', 'U'].includes(e.sym)) r = 2;
  const [g, p] = pos(e.n);
  return { n: e.n, sym: e.sym, ja: e.ja, cat: e.cat, note: e.note, st: e.st, em: EMOJI[i], r, g, p };
});
fs.writeFileSync(path.join(__dirname, '../app/data/elements.js'), '// 自動生成(tools/build-data.js)。手で編集しない。\nwindow.ELEMENTS = ' + JSON.stringify(out) + ';\n');
console.log('elements', out.length, 'rarity', [0, 1, 2, 3].map(r => out.filter(e => e.r === r).length).join('/'));
// 位置のかさなりチェック
const seen = {}; for (const e of out) { const k = e.g + ',' + e.p; if (seen[k]) throw new Error('pos dup ' + e.sym + ' ' + seen[k]); seen[k] = e.sym; }

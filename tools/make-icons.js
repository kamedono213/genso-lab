// PWA用アイコン: 紺の地に、元素カード風の「H2O」とフラスコ。Playwright で撮る。
// 実行: node tools/make-icons.js
const { chromium } = require('C:/Users/user/Desktop/自作ゲーム/2_カードゲーム/DigimonCard/node_modules/playwright');
const path = require('path'), fs = require('fs');
const out = path.join(__dirname, '../app/icons');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  for (const [name, size, pad] of [['icon-192.png', 192, 0.1], ['icon-512.png', 512, 0.1], ['maskable-512.png', 512, 0.22], ['apple-touch-icon.png', 180, 0.1]]) {
    await p.setViewportSize({ width: size, height: size });
    const u = size * (1 - pad * 2) / 100; // 内側を100等分
    await p.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0"><div style="width:${size}px;height:${size}px;background:radial-gradient(circle at 50% 30%,#3550b0,#0f1a3c);display:grid;place-items:center">
      <div style="position:relative;width:${u * 100}px;height:${u * 100}px">
        <div style="position:absolute;left:${u * 4}px;top:${u * 30}px;width:${u * 40}px;height:${u * 52}px;border-radius:${u * 7}px;background:#5fc8f7;transform:rotate(-12deg);box-shadow:0 ${u * 2}px 0 #0006;display:grid;place-items:center;font:800 ${u * 30}px Arial;color:#111">H</div>
        <div style="position:absolute;left:${u * 56}px;top:${u * 30}px;width:${u * 40}px;height:${u * 52}px;border-radius:${u * 7}px;background:#ffd54f;transform:rotate(12deg);box-shadow:0 ${u * 2}px 0 #0006;display:grid;place-items:center;font:800 ${u * 30}px Arial;color:#111">O</div>
        <div style="position:absolute;left:${u * 27}px;top:${u * 6}px;width:${u * 46}px;height:${u * 60}px;border-radius:${u * 8}px;background:#fff;box-shadow:0 ${u * 3}px 0 #0007;display:grid;place-items:center;font:800 ${u * 24}px Arial;color:#0f1a3c">H<sub style="font-size:.6em;vertical-align:-.3em">2</sub>O</div>
      </div></div>`);
    await p.screenshot({ path: path.join(out, name), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await b.close(); console.log('icons written');
})();

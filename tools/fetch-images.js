// 元素118個の写真を Wikimedia Commons から取り、app/img/el/<番号>.jpg に保存する。
// 日本語版ウィキペディアの各元素の記事の代表画像を使い、ライセンス(PD / CC0 / CC BY / CC BY-SA)だけ採用する。
// 作者・ライセンスは app/data/credits.js に書き出す(アプリの中の「しゃしんについて」で表示)。
// 実行: node tools/fetch-images.js   (途中から再開できる)
const fs = require('fs'), path = require('path');
const EL = require('./elements-base.json');
const UA = { 'User-Agent': 'onze-gensolab/1.0 (kamedono213 github; contact via github)' };
const OUT = path.join(__dirname, '../app');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OK = /^(Public domain|PD|CC0|FAL|CC BY(-SA)? [0-9.]+( [a-z]+)?)/i; // FAL = Free Art License(作者名を出せば配ってよい)
const BAD = /(Electron[ _]shell|電子配置|spectrum|スペクトル|structure|結晶構造|lattice|Flag|map|地図|symbol|logo|\.svg$|portrait|肖像)/i;
// 記事名が元素名とちがうもの
const TITLE = { 金: '金', 銀: '銀', 銅: '銅', 鉄: '鉄', 鉛: '鉛', 白金: '白金', 水銀: '水銀', 硫黄: '硫黄', スズ: 'スズ', 亜鉛: '亜鉛' };
// 記事の代表画像が向かない時に使う、Commons のファイル名(手で指定)
const FORCE = fs.existsSync(path.join(__dirname, 'image-force.json')) ? require('./image-force.json') : {};

async function getJson(u) {
  for (let i = 0; i < 6; i++) {
    try { const t = await (await fetch(u, { headers: UA })).text(); if (t.startsWith('{')) return JSON.parse(t); } catch (e) { /* もう一度 */ }
    await sleep(15000);
  }
  throw new Error('API rate limit: ' + u.slice(0, 80));
}
async function getBin(u) {
  for (let i = 0; i < 6; i++) {
    try { const r = await fetch(u, { headers: UA }); if (r.ok) return Buffer.from(await r.arrayBuffer()); await sleep(r.status === 429 ? 60000 : 5000); } catch (e) { await sleep(5000); }
  }
  throw new Error('download failed ' + u);
}
(async () => {
  const stateFile = path.join(__dirname, 'image-state.json');
  const S = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
  // 1) 記事の代表画像のファイル名
  const need = EL.filter(e => !(e.n in S) || FORCE[e.n] && S[e.n] && S[e.n].file !== FORCE[e.n]);
  for (let i = 0; i < need.length; i += 20) {
    const chunk = need.slice(i, i + 20);
    const j = await getJson('https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=name&redirects=1&titles=' + encodeURIComponent(chunk.map(e => TITLE[e.ja] || e.ja).join('|')));
    const back = {}; (j.query.normalized || []).forEach(n => back[n.to] = n.from); (j.query.redirects || []).forEach(n => back[n.to] = back[n.from] || n.from);
    for (const p of Object.values(j.query.pages || {})) {
      const t = back[p.title] || p.title, e = chunk.find(x => (TITLE[x.ja] || x.ja) === t);
      if (e) S[e.n] = { file: FORCE[e.n] || p.pageimage || null };
    }
    for (const e of chunk) if (!(e.n in S)) S[e.n] = { file: FORCE[e.n] || null };
    await sleep(1500);
  }
  // 2) ライセンスと作者
  const files = EL.filter(e => S[e.n].file && !S[e.n].license && !S[e.n].skip).map(e => e.n);
  for (let i = 0; i < files.length; i += 30) {
    const chunk = files.slice(i, i + 30);
    const j = await getJson('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=500&format=json&titles=' + encodeURIComponent(chunk.map(n => 'File:' + S[n].file).join('|')));
    const norm = {}; (j.query.normalized || []).forEach(n => norm[n.to] = n.from);
    for (const q of Object.values(j.query.pages)) {
      const name = (norm[q.title] || q.title).replace(/^File:/, '');
      const n = chunk.find(k => S[k].file === name || S[k].file.replace(/_/g, ' ') === name.replace(/_/g, ' '));
      const ii = q.imageinfo && q.imageinfo[0];
      if (!n) continue;
      if (!ii) { S[n].skip = 'no imageinfo'; continue; }
      const md = ii.extmetadata || {};
      Object.assign(S[n], { license: md.LicenseShortName ? md.LicenseShortName.value : '', artist: md.Artist ? md.Artist.value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) : '', page: ii.descriptionurl, thumb: ii.thumburl });
    }
    await sleep(1500);
  }
  // 3) ダウンロード
  const credits = [];
  for (const e of EL) {
    const s = S[e.n];
    if (!s.file) { s.skip = s.skip || 'no image'; continue; }
    if (!FORCE[e.n] && BAD.test(s.file)) { s.skip = 'not a photo: ' + s.file; continue; }
    if (!OK.test(s.license || '')) { s.skip = 'license: ' + s.license; continue; }
    delete s.skip;
    const target = path.join(OUT, 'img/el', e.n + '.jpg');
    if (!fs.existsSync(target) || s.saved !== s.file) { fs.writeFileSync(target, await getBin(s.thumb.split('?')[0])); s.saved = s.file; await sleep(2500); fs.writeFileSync(stateFile, JSON.stringify(S, null, 1)); }
    credits.push({ n: e.n, name: e.ja, license: s.license, artist: s.artist || '(作者の記載なし)', page: s.page });
  }
  fs.writeFileSync(stateFile, JSON.stringify(S, null, 1));
  fs.writeFileSync(path.join(OUT, 'data/credits.js'), '// 自動生成(tools/fetch-images.js)。手で編集しない。\nwindow.CREDITS = ' + JSON.stringify(credits) + ';\nwindow.HAS_IMG = ' + JSON.stringify(credits.map(c => c.n)) + ';\n');
  console.log('images', credits.length, '/ 118');
  for (const e of EL) if (S[e.n].skip) console.log('SKIP', e.n, e.ja, S[e.n].skip);
})().catch(e => { console.error(e.message); process.exit(1); });

// 一度だけ使った書きかえ(2026-11-14): クラウド保存を「ひなはるコレクト」と同じ、自分で決めるID方式に。もう実行しない。
const fs = require('fs'), path = require('path');
const f = path.join(__dirname, '../src/main.js'); let s = fs.readFileSync(f, 'utf8');
const a = s.indexOf('// ---------- 記録のバックアップ'), b = s.indexOf('function pushNet()');
if (a < 0 || b < 0) throw new Error('block');
s = s.slice(0, a) + `// ---------- 記録のクラウド保存(ひなはるコレクトと同じ方式: 自分で決めた「ID」で もどせる。パスワードなし)
// 場所は gensoSaves/<ID>。ID は 2〜12文字(ひらがな・カタカナ・英数字)。大文字・全角は そろえる
const CLOUD = (() => {
  const normId = v => String(v || '').normalize('NFKC').trim().toLowerCase();
  const idOk = id => /^[a-z0-9ぁ-んァ-ヶー_-]{2,12}$/.test(id);
  const u = async id => \`\${NET.FB.db}/gensoSaves/\${encodeURIComponent(id)}.json?auth=\${await NET.auth()}\`;
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
        if (!h || (h.dev !== DEV && h.at > S.cloudAt)) { const old = S.id; S.id = null; S.cloudAt = 0; keep(); toast(\`ID「\${old}」は ほかのスマホで つかわれたので、このスマホの 自動保存を とめたよ\`, 4000); return false; }
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
    d.innerHTML = \`<div class="box">\${html}<div class="acts"><button class="btn main" id="y">\${yes}</button><button class="btn" id="n">やめる</button></div></div>\`;
    document.body.appendChild(d);
    $('#n', d).onclick = () => { d.remove(); res(false); };
    $('#y', d).onclick = () => { d.remove(); res(true); };
  });
}
function keepScreen(note) {
  const sum = d => \`元素 \${Object.keys(d.el || {}).length} / 118・化合物 \${Object.keys(d.cp || {}).length} / \${CP.length}・🧪 \${d.coins | 0}・バトル \${d.wins | 0}勝\`;
  screen(\`\${topBar('きろくの ほぞん', home)}
    <div class="prog" style="text-align:center">\${S.id
      ? \`<b>☁️ ID「<span data-nofuri>\${esc(S.id)}</span>」で ほぞん中</b>
        <span class="note">記録は、あそぶたびに 自動で ネットにも ほぞんされる。<br>アプリのデータが消えても、スマホをかえても、この ID でログインすれば もどせる。</span>
        <span class="note">\${S.cloudAt ? 'さいごの ほぞん: ' + new Date(S.cloudAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'まだ ネットに ほぞんできていない'}</span>
        <button class="btn main" id="now">☁️ いま ほぞんする</button>\`
      : \`<b>まだ この端末の中だけに ほぞんされている</b>
        <span class="note">ID を きめると、ネットにも ほぞんされる。アプリのデータが消えても、スマホをかえても もどせるよ。</span>\`}</div>
    <div class="prog"><b>\${S.id ? 'べつの ID で ほぞんする' : 'ID を きめて ほぞんする'}</b>
      <input class="txt" id="nid" maxlength="12" placeholder="すきな ID(2〜12文字)" autocomplete="off" autocapitalize="off">
      <span class="note">ひらがな・カタカナ・英数字。パスワードは いらない。ほかの人と 同じ ID は つかえない。</span>
      <button class="btn \${S.id ? '' : 'main'}" id="mkid">この ID で ほぞんする</button></div>
    <div class="prog"><b>ID で ログイン(記録を よみこむ)</b>
      <input class="txt" id="lid" maxlength="12" placeholder="まえに きめた ID" autocomplete="off" autocapitalize="off">
      <button class="btn" id="login">ログイン</button>
      <span class="note">ログインすると、この端末の 今の記録は その ID の記録に 入れかわる。</span></div>
    <p class="note" id="kmsg" style="text-align:center;color:var(--accent)">\${note || ''}</p>\`, home);
  const msg = t => { $('#kmsg').textContent = t; SE.play('ng'); };
  const now = $('#now'); if (now) now.onclick = async () => { now.disabled = true; const ok = await CLOUD.save(); keepScreen(ok ? '☁️ ほぞんした!' : S.id ? 'ほぞんできなかった(インターネットを たしかめてね)' : ''); };
  $('#mkid').onclick = async () => {
    const id = CLOUD.normId($('#nid').value);
    if (!CLOUD.idOk(id)) return msg('ID は 2〜12文字。ひらがな・カタカナ・英数字で きめてね');
    if (id === S.id) return msg('いま つかっている ID だよ');
    let used; try { used = await CLOUD.load(id); } catch (e) { return msg('インターネットに つながらない'); }
    if (used) {
      if (!await ask(\`<b>ID「\${esc(id)}」は もう つかわれている</b><p>\${sum(used)}</p><p class="note">自分の ID なら「ログイン」の方を つかってね。<br>この記録を 消して、今の記録で 上書きする?</p>\`, '上書きする')) return;
      if (!await ask(\`<b>ほんとうに 上書きする?</b><p class="note">ID「\${esc(id)}」に入っていた記録(\${sum(used)})は 消えて、もどせない。</p>\`, '消して 上書きする')) return;
    }
    const before = S.id, bAt = S.cloudAt; S.id = id; S.cloudAt = 0;
    if (!await CLOUD.save(true)) { S.id = before; S.cloudAt = bAt; return msg('ほぞんできなかった。もういちど ためしてね'); }
    SE.play('perfect'); keepScreen(\`☁️ ID「\${id}」で ほぞんした!\`);
  };
  $('#login').onclick = async () => {
    const id = CLOUD.normId($('#lid').value);
    if (!CLOUD.idOk(id)) return msg('ID は 2〜12文字。ひらがな・カタカナ・英数字だよ');
    if (id === S.id) return msg('いま つかっている ID だよ');
    let d; try { d = await CLOUD.load(id); } catch (e) { return msg('インターネットに つながらない'); }
    if (!d) return msg(\`ID「\${id}」の記録は 見つからなかった\`);
    if (!await ask(\`<b>ID「\${esc(id)}」で ログインする?</b><p>\${sum(d)}</p><p class="note">この端末の 今の記録(\${sum(S)})は 入れかわるよ。\${S.id ? '' : '<br>今の記録を のこしたい時は、先に ID を きめて ほぞんしてね。'}</p>\`, 'ログインする')) return;
    CLOUD.adopt(d, id); await CLOUD.save(true); SE.play('perfect'); keepScreen('ログインした!');
  };
}
` + s.slice(b);
const rep = (x, y) => { if (!s.includes(x)) throw new Error('missing: ' + x.slice(0, 50)); s = s.replace(x, () => y); };
rep('\nhome();\nCLOUD.boot();\n', '\nhome();\nif (S.id) CLOUD.save();\n');
rep("<a href=\"#\" id=\"keep\" style=\"color:var(--mute)\">💾 きろくの ほぞん</a>", "<a href=\"#\" id=\"keep\" style=\"color:${S.id ? 'var(--mute)' : 'var(--accent)'}\">${S.id ? '☁️ ID「' + esc(S.id) + '」で ほぞん中' : '💾 きろくを ネットにも ほぞんする'}</a>");
rep("。<b class=\"glowtxt\">光っているカード</b>をとると つくれるよ'", "。<b class=\"glowtxt\">光るカード</b>で つくれるよ'");
rep("'。うすく光る2まいを とると つくれるよ'", "'。うすく光る2まいで つくれるよ'");
fs.writeFileSync(f, s); console.log('ok');

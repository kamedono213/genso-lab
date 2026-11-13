// げんそラボ: バトルのルール(画面とは切りはなしてある。node でもテストできる)
// 状態 G = { deck, discard, market[5], players[2]{name, hand[], score, made{}}, turn, takes, turnMade[], bonusNeutral, log[], winner, seq }
(function (root) {
  'use strict';
  const C = root.COMPOUNDS, DC = root.DECK_COUNTS;
  const byId = {}; C.forEach(c => { byId[c.id] = c; c.size = Object.values(c.p).reduce((a, b) => a + b, 0); });
  const TARGET = 30, HAND_MAX = 10, MARKET = 5, START_HAND = 6, TAKES = 2;

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function newDeck() { const d = []; for (const [s, n] of Object.entries(DC)) for (let i = 0; i < n; i++) d.push(s); return shuffle(d); }
  function draw(G) {
    if (!G.deck.length) { G.deck = shuffle(G.discard); G.discard = []; }
    return G.deck.length ? G.deck.pop() : null;
  }
  function newGame(names) {
    const G = { deck: newDeck(), discard: [], market: [], players: names.map(n => ({ name: n, hand: [], score: 0, made: {} })), turn: 0, takes: 1, turnMade: [], bonusNeutral: false, log: [], winner: null, seq: 0, last: null };
    for (const p of G.players) for (let i = 0; i < START_HAND; i++) p.hand.push(draw(G));
    for (let i = 0; i < MARKET; i++) G.market.push(draw(G));
    return G;
  }
  const count = hand => { const m = {}; for (const s of hand) m[s] = (m[s] || 0) + 1; return m; };
  // 手ふだで いま作れるもの
  function makeable(hand) { const m = count(hand); return C.filter(c => Object.entries(c.p).every(([s, n]) => (m[s] || 0) >= n)); }
  // あと1まいで作れるもの → [{c, need}]
  function near(hand) {
    const m = count(hand), out = [];
    for (const c of C) {
      let miss = 0, need = null;
      for (const [s, n] of Object.entries(c.p)) { const d = n - (m[s] || 0); if (d > 0) { miss += d; need = s; } }
      if (miss === 1) out.push({ c, need });
    }
    return out;
  }
  // えらんだカード(記号の配列)が、ちょうど何かの化合物になっているか
  function matchExact(syms) {
    const m = count(syms), keys = Object.keys(m);
    return C.find(c => Object.keys(c.p).length === keys.length && keys.every(s => c.p[s] === m[s])) || null;
  }
  // そのプレイヤーが いま作ったら何点か
  function pointsFor(G, pi, c) {
    const p = G.players[pi];
    let pt = p.made[c.id] ? 1 : c.pt;
    if (G.turnMade.length >= 1) pt += 1; // 同じターンに2つ目から +1(コンボ)
    return pt;
  }
  function take(G, src) { // src: 0-4 = 実験台、'deck' = 山札
    if (G.winner !== null || G.takes <= 0) return false;
    const p = G.players[G.turn];
    let card;
    if (src === 'deck') card = draw(G);
    else { card = G.market[src]; if (!card) return false; G.market[src] = draw(G); }
    if (!card) return false;
    p.hand.push(card); G.takes--; G.seq++;
    G.last = { type: 'take', by: G.turn, card, src };
    return true;
  }
  function make(G, id) {
    if (G.winner !== null) return null;
    const c = byId[id], pi = G.turn, p = G.players[pi], o = G.players[1 - pi];
    if (!c || !makeable(p.hand).includes(c)) return null;
    for (const [s, n] of Object.entries(c.p)) for (let i = 0; i < n; i++) { p.hand.splice(p.hand.indexOf(s), 1); G.discard.push(s); }
    const first = !p.made[c.id];
    let pt = pointsFor(G, pi, c);
    const ev = { type: 'make', by: pi, id, pt, first, combo: G.turnMade.length >= 1, effect: null, neutral: false };
    p.made[c.id] = (p.made[c.id] || 0) + 1;
    G.turnMade.push(id);
    if (c.t === 'acid' && o.hand.length) { // 酸: あいての手ふだを1まい とかす
      const i = Math.floor(Math.random() * o.hand.length), lost = o.hand.splice(i, 1)[0];
      G.discard.push(lost); ev.effect = { kind: 'acid', lost };
    }
    if (c.t === 'alkali') { const d = draw(G); if (d) { p.hand.push(d); ev.effect = { kind: 'alkali', got: d }; } }
    // 中和: 同じターンに 酸とアルカリを両方つくると +2(1ターンに1回)
    const types = G.turnMade.map(x => byId[x].t);
    if (!G.bonusNeutral && types.includes('acid') && types.includes('alkali')) { G.bonusNeutral = true; pt += 2; ev.neutral = true; ev.pt = pt; }
    p.score += pt; G.seq++;
    G.log.push({ by: pi, id, pt });
    if (p.score >= TARGET) G.winner = pi;
    G.last = ev;
    return ev;
  }
  const overHand = G => Math.max(0, G.players[G.turn].hand.length - HAND_MAX);
  function discard(G, sym) { const h = G.players[G.turn].hand, i = h.indexOf(sym); if (i < 0) return false; h.splice(i, 1); G.discard.push(sym); G.seq++; return true; }
  function endTurn(G) {
    if (G.winner !== null || G.takes > 0 || overHand(G) > 0) return false;
    G.turn = 1 - G.turn; G.takes = TAKES; G.turnMade = []; G.bonusNeutral = false; G.seq++;
    G.last = { type: 'end' };
    return true;
  }

  // ---------- CPU(lv 0=やさしい / 1=ふつう / 2=つよい)
  // 手ふだの「のびしろ」: 作れるものの点 + あと1まいのものの点の一部
  // 作れるもの=満点、あと1まい=半分、あと2まい=2わり として、いちばん高いものを見る
  function handValue(G, pi, hand) {
    const p = G.players[pi], m = count(hand);
    let v = 0;
    for (const c of C) {
      let miss = 0; for (const [s, n] of Object.entries(c.p)) miss += Math.max(0, n - (m[s] || 0));
      if (miss > 2) continue;
      const pt = (p.made[c.id] ? 1 : c.pt) * (miss === 0 ? 1 : miss === 1 ? 0.5 : 0.2);
      if (pt > v) v = pt;
    }
    return v;
  }
  function cpuTake(G, lv) {
    const pi = G.turn, p = G.players[pi];
    if (lv === 0 && Math.random() < 0.5) return Math.random() < 0.5 ? 'deck' : Math.floor(Math.random() * MARKET);
    let best = 'deck', bv = handValue(G, pi, p.hand) + (lv === 2 ? 0.6 : 0.3);
    G.market.forEach((s, i) => { if (!s) return; const v = handValue(G, pi, p.hand.concat(s)); if (v > bv) { bv = v; best = i; } });
    return best;
  }
  // 作る順番: 点の高い順(つよいは コンボと中和をねらって、作れるものを全部つくる)
  function cpuMake(G, lv) {
    const pi = G.turn, p = G.players[pi], list = makeable(p.hand);
    if (!list.length) return null;
    if (lv === 0) { if (Math.random() < 0.25) return null; return list[Math.floor(Math.random() * list.length)].id; }
    const val = c => pointsFor(G, pi, c) + (c.t === 'acid' ? 0.8 : 0) + (c.t === 'alkali' ? 0.6 : 0);
    list.sort((a, b) => val(b) - val(a));
    const top = list[0];
    if (lv === 1) return top.id;
    // つよい: 作ったあとの手ふだの のびしろも見る。もっと大きいものが近いなら、作らずにためる
    if (p.score + pointsFor(G, pi, top) >= TARGET) return top.id;
    let best = null, bv = handValue(G, pi, p.hand) - (p.hand.length >= HAND_MAX - 1 ? 3 : 0.01);
    for (const c of list) {
      const rest = p.hand.slice(); for (const [s, n] of Object.entries(c.p)) for (let i = 0; i < n; i++) rest.splice(rest.indexOf(s), 1);
      const v = val(c) + handValue(G, pi, rest) * 0.9;
      if (v > bv) { bv = v; best = c.id; }
    }
    return best;
  }
  function cpuDiscard(G) { // いちばん使い道の少ないカード
    const pi = G.turn, h = G.players[pi].hand;
    let best = h[0], bv = -1;
    for (const s of new Set(h)) { const rest = h.slice(); rest.splice(rest.indexOf(s), 1); const v = handValue(G, pi, rest); if (v > bv) { bv = v; best = s; } }
    return best;
  }

  root.ENGINE = { TARGET, HAND_MAX, MARKET, TAKES, byId, newGame, makeable, near, matchExact, pointsFor, take, make, overHand, discard, endTurn, cpuTake, cpuMake, cpuDiscard, count };
})(typeof window !== 'undefined' ? window : globalThis);

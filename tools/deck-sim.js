// 山札の枚数を変えた時の遊びやすさを CPU 同士で比べる(2026-11-15)
// 使い方: node tools/deck-sim.js   → 旧と新の 平均ターン数・終わり時の手札の「使えない元素」の数
global.window = global;
require('../app/data/compounds.js');
const NEW = { ...window.DECK_COUNTS };
const OLD = { H: 16, O: 14, C: 8, N: 5, Cl: 6, Na: 5, S: 5, Ca: 4, Fe: 3, Cu: 4, Mg: 3, K: 3, Al: 2, Si: 2, Zn: 2, Ag: 3, Au: 2, He: 2, Ne: 2, Ar: 1, F: 2, I: 1, Ti: 1, Pt: 1, U: 1 };
function run(dc, games) {
  window.DECK_COUNTS = dc;
  delete require.cache[require.resolve('../app/engine.js')];
  delete window.ENGINE;
  require('../app/engine.js');
  const E = window.ENGINE;
  let turns = 0, discards = 0, makes = 0, noMakeTurns = 0, n = 0, stuck = 0;
  for (let g = 0; g < games; g++) {
    const G = E.newGame(['A', 'B']);
    let t = 0;
    while (G.winner == null && t < 300) {
      for (let k = 0; k < E.TAKES && G.winner == null; k++) E.take(G, E.cpuTake(G, 1));
      let id, m = 0;
      while (G.winner == null && (id = E.cpuMake(G, 1))) { E.make(G, id); m++; }
      makes += m; if (!m) noMakeTurns++;
      while (G.winner == null && E.overHand(G) > 0) { E.discard(G, E.cpuDiscard(G)); discards++; }
      if (G.winner == null) E.endTurn(G);
      t++;
    }
    if (t >= 300) stuck++;
    turns += t; n++;
  }
  return { 決着までのターン: (turns / n).toFixed(1), 作れなかったターンの割合: (noMakeTurns / turns * 100).toFixed(0) + '%', '1試合で捨てた枚数': (discards / n).toFixed(1), 終わらない試合: stuck };
}
console.log('旧', run(OLD, 1000));
console.log('新', run(NEW, 1000));

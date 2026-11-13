// app/app.js を作る: 「もどる」確認 + ふりがな + 効果音(onze.ltd/reference の共通部品)+ src/main.js
// 実行: node tools/assemble.js
const fs = require('fs'), path = require('path');
const REF = 'D:/onze.ltd/reference';
const rd = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const out = "'use strict';\n" + rd(REF + '/leave-confirm-snippet.js') + '\n' + rd(REF + '/furigana-runtime.js') + '\n' + rd(REF + '/se-snippet.js') + '\n' + rd(path.join(__dirname, '../src/main.js'));
fs.writeFileSync(path.join(__dirname, '../app/app.js'), out);
console.log('app.js', out.length);

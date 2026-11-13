# げんそラボ

元素を集めて化合物をつくるカードゲーム + 元素ずかん(118) + クイズ。子ども向けの勉強アプリ。

- 公開: https://kamedono213.github.io/genso-lab/
- 作り: `src/main.js`(画面)+ `app/engine.js`(ルール)。`node tools/assemble.js` で `app/app.js` を作り、`node D:\onze.ltd\tools\furigana\make-furi.js .` → `node tools/build-pages.js` で `docs/` を作る
- 元素の写真: Wikimedia Commons(`tools/fetch-images.js`。作者・ライセンスはアプリ内「しゃしんについて」)
- 対戦: Firebase Realtime Database の `gensoRooms/<4けた>`

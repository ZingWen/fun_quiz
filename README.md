# little_living_test

一個包裝成心理測驗的小網站。

## 技術

沒有使用任何框架，是純 HTML、CSS 和 JavaScript（vanilla JS）寫的。

- 不需要安裝套件，也沒有建置步驟
- 沒有任何外部相依（沒有 CDN、沒有字型下載），離線也能跑
- 動畫用的都是瀏覽器內建功能：煙火是 Canvas 2D，按鈕碎裂是 Web Animations API 加上 CSS `clip-path`，按鈕逃跑是 CSS `transform`

## 怎麼執行

用瀏覽器直接開啟 `index.html` 即可。

要放上網路的話，把整個資料夾丟到任何靜態網站空間（GitHub Pages、Netlify、Cloudflare Pages 等）就可以了。

## 檔案結構

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 頁面骨架，載入下面三個檔案 |
| `style.css` | 所有樣式與顏色 |
| `questions.js` | 題目內容與流程設定，**新增題目只需要改這個檔案** |
| `app.js` | 程式邏輯：畫面切換、逃跑按鈕、碎裂效果、煙火 |

## 新增題目

所有題目都在 `questions.js` 的 `questions` 物件裡，每一題有一個代號（例如 `q1`、`hidden1`）。

```js
q2: {
  label: '第 2 題',
  text: '題目文字',
  options: [
    { text: '選項 A', type: 'accept', result: { message: '結果文字', effect: 'fireworks' } },
    { text: '選項 B', type: 'flee' },
  ],
},
```

### 選項的行為（`type`）

| type | 行為 |
| --- | --- |
| `accept` | 可以點擊。有 `result` 就顯示結果畫面，只有 `next` 就直接跳到下一題 |
| `flee` | 滑鼠或手指一碰到就逃跑，永遠點不到 |
| `shatter` | 點擊後碎掉消失 |
| `walk` | 點擊後長出兩隻腳，慢慢走到別的地方再把腳收起來 |

### 其他設定

- `result.message`：結果畫面的文字，用 `\n` 換行
- `result.effect`：`'fireworks'`（夜色加煙火）、`'warm'`（暖色調），或不填
- `next: '題目代號'`：寫在 `accept` 選項上，結果畫面會出現「下一題」按鈕；沒寫就是「再測一次」
- `gatherAfter: 次數`：寫在題目上，`walk` 按鈕合計被點擊這麼多次後，會全部走到 `accept` 按鈕後面躲起來，之後點那個位置一律算點擊 `accept`
- `stubborn`：寫在題目上，逃跑按鈕累積逃跑 `after` 次後，右下角會出現隱藏入口

```js
stubborn: { after: 8, text: '看來你很堅持...', button: '沒錯', goto: 'hidden1' },
```

### 把題目串起來

第一題由 `start` 指定。要讓第 1 題接到第 2 題，在第 1 題的 `accept` 選項加上 `next: 'q2'`。

## 改外觀

- 首頁標題、說明文字、開始按鈕：`questions.js` 最上面的 `title`、`intro`、`startButton`
- 瀏覽器分頁標題：`index.html` 的 `<title>`
- 顏色：`style.css` 最上面的 `:root` 變數；`body.night` 和 `body.warm` 是兩種結果畫面的配色

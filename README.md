# little_living_test

一個包裝成心理測驗的簡單小網站，總之就是狂灌油膩雞湯。

## 技術

沒有使用任何框架，是純 HTML、CSS 和 JavaScript（vanilla JS）寫的。

- 不需安裝套件，也沒有建置步驟
- 沒有任何外部相依（沒有 CDN、沒有字型下載），離線也能跑
- 動畫用的都是瀏覽器內建功能或是純CSS寫的：煙火是 Canvas 2D，按鈕碎裂是 Web Animations API 加上 CSS `clip-path`，按鈕逃跑是 CSS `transform`

## 怎麼執行

用瀏覽器直接開啟 `index.html` 即可。

🌙 Git page已部署：**https://zingwen.github.io/fun_quiz/**

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
| `shrink` | 每點一次就變小一點 |
| `drop` | 點擊後掉到畫面底部，右下角出現提示；拖曳它或搖晃手機，它會用力過猛撞到邊界碎掉 |
| `crack` | 每點一次整個畫面就從點擊的位置多裂一點，點到 `crackAfter` 次（預設 4）畫面碎掉落下，只剩全黑 |
| `tilt` | 每點一次就往右歪一點，點 `after` 次（預設 4）後開始加速旋轉，右下角出現 `spin` 提示 |
| `fade` | 點擊後淡化消失，右下角出現 `confirm: { text, button, goto }` 的確認入口 |

### 其他設定

- `result.message`：結果畫面的文字，用 `\n` 換行
- `result.effect`：`'fireworks'`（夜色加煙火）、`'warm'`（暖色調），或不填
- `next: '題目代號'`：寫在 `accept` 選項上，結果畫面會出現「下一題」按鈕；沒寫就是「再測一次」
- `gatherAfter: 次數`：寫在題目上，`walk` 按鈕合計被點擊這麼多次後，會全部走到 `accept` 按鈕後面躲起來，之後點那個位置一律算點擊 `accept`
- `stubborn`：寫在題目上，逃跑按鈕的逃跑次數加上縮小、裂開按鈕被點的次數，累積 `after` 次後，右下角會出現隱藏入口（裂開的畫面會等碎片掉完才出現）
- `mood: 'void'`：寫在題目上，題目畫面維持全黑（畫面碎掉後接的隱藏題用這個）
- `big: 倍數`：寫在任何選項上，按鈕放大這麼多倍（手機上會自動縮到不超出畫面）
- `orbit: true`：寫在任何選項上，按鈕會繞著放大（`big`）的那顆按鈕快速轉圈，還是點得到
- `auto: { after: 秒數, goto: '題目代號' }`：寫在題目上，等待幾秒後自動跳到另一題；可搭配 `options: []`（沒有任何選項）
- `late: { after: 秒數, text: '文字' }`：寫在題目上，一開始只有題目、沒有選項，等待幾秒後這段文字接在題目後面，和選項一起淡入（不換頁）
- `hint` / `broken`：寫在 `drop` 選項上。`hint: { shake, drag }` 是掉到地上後的提示（手機、平板顯示 `shake`，電腦顯示 `drag`），`broken` 是碎掉後的提示
- 搖晃功能需要用 HTTPS 開啟網頁（`file://` 或 `http://` 下手機不會給動作感測資料），ios 第一次會跳出授權視窗；拖曳則在所有裝置都能用

```js
stubborn: { after: 8, text: '看來你很堅持...', button: '沒錯', goto: 'hidden1' },
```

### 把題目串起來

舉例：第一題由 `start` 指定。要讓第 1 題接到第 2 題，在第 1 題的 `accept` 選項加上 `next: 'q2'`。

## 改外觀

- 首頁標題、說明文字、開始按鈕：`questions.js` 最上面的 `title`、`intro`、`startButton`
- 瀏覽器分頁標題：`index.html` 的 `<title>`
- 顏色：`style.css` 最上面的 `:root` 變數；`body.night` 和 `body.warm` 是兩種結果畫面的配色

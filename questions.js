/*
 * 測驗內容設定檔 —— 之後要新增題目，只需要改這個檔案。
 *
 * 每一題的格式：
 *   題目代號: {
 *     label:   題號標籤（例如「第 2 題」）
 *     text:    題目文字
 *     options: 選項陣列，每個選項有 text（按鈕文字）與 type（行為）：
 *       type: 'accept'  → 可以點擊的選項。
 *                          result: { message, effect } 點擊後顯示的畫面
 *                                  effect 可用 'fireworks'（煙火）、'warm'（溫暖色調）或不填
 *                          next:   '題目代號'  接著要去的下一題（可省略）
 *                          只寫 next 不寫 result，就會直接跳到下一題。
 *       type: 'flee'    → 滑鼠一碰到就逃跑的選項，永遠點不到。
 *       type: 'shatter' → 點擊後碎掉消失的選項。
 *       type: 'walk'    → 點擊後長出兩隻腳，慢慢走到別的地方。
 *       type: 'shrink'  → 每點一次就變小一點。
 *       type: 'drop'    → 點擊後掉到畫面底部，右下角出現提示；
 *                          拖曳或搖晃手機讓它撞到邊界就會碎掉。
 *                          hint:   { shake: 手機/平板的提示, drag: 電腦的提示 }
 *                          broken: 碎掉後右下角的提示
 *       type: 'crack'   → 每點一次整個畫面就多裂一點，點到 crackAfter 次
 *                          畫面碎掉落下，只剩全黑背景。
 *       type: 'tilt'    → 每點一次就往右歪一點，點 after 次後開始加速旋轉，
 *                          右下角出現 spin 提示文字。
 *       type: 'fade'    → 點擊後淡化消失，右下角出現確認用的入口。
 *                          confirm: { text: 提示文字, button: 按鈕文字, goto: '題目代號' }
 *       任何選項都可以加 big: 倍數，讓按鈕放大（例如 big: 5）。
 *       任何選項都可以加 orbit: true，讓按鈕繞著放大的那顆按鈕快速轉圈（還是點得到）。
 *     options 可以是空陣列（沒有任何選項），搭配 auto 使用。
 *     auto: （可省略）{ after: 秒數, goto: '題目代號' } 等待幾秒後自動跳到另一題。
 *     late: （可省略）{ after: 秒數, text: '接在題目後面的文字' }
 *       一開始只有題目、沒有選項，等待幾秒後，這段文字和選項才一起淡入（不換頁）。
 *     mood: （可省略）題目畫面的配色，'void' 是全黑。
 *     crackAfter: （可省略，預設 4）'crack' 按鈕合計點幾次畫面會整個碎掉。
 *     gatherAfter: （可省略）'walk' 按鈕合計被點擊這麼多次後，
 *       全部一起走到 'accept' 按鈕後面躲起來，之後點那個位置一律算點擊 'accept'。
 *     stubborn: （可省略）逃跑按鈕逃跑次數加上縮小、裂開按鈕被點的次數，
 *       累積夠多次後，右下角出現的隱藏入口
 *       { after: 次數, text: 提示文字, button: 按鈕文字, goto: '題目代號' }
 *   }
 *
 * 範例：在第 1 題的「同意」加上 next: 'q2'，再新增一個 q2 題目，
 *       結果畫面就會出現「下一題」按鈕。
 */
window.QUIZ = {
  title: '問你點問題',
  intro: '只需要一點點時間，\n憑直覺回答就好。',
  startButton: '開始回答',
  start: 'q1',

  questions: {
    q1: {
      label: '第 1 題',
      text: '我是個很棒的人',
      options: [
        {
          text: '同意',
          type: 'accept',
          result: { message: '我也有同感，\n我以你為傲。', effect: 'fireworks' },
          next: 'q2',
        },
        { text: '普通', type: 'flee' },
        { text: '不同意', type: 'flee' },
      ],
      stubborn: {
        after: 8,
        text: '看來你很堅持...',
        button: '沒錯',
        goto: 'hidden1',
      },
    },

    hidden1: {
      label: '隱藏題',
      text: '那當你覺得你不太棒\n或是很普通的時候，\n我也可以一起待著嗎？',
      options: [
        {
          text: '好',
          type: 'accept',
          result: { message: '謝謝你讓我待著，\n我也想待著。', effect: 'warm' },
          next: 'q2',
        },
        { text: '不好', type: 'shatter' },
      ],
    },

    q2: {
      label: '第 2 題',
      text: '我值得別人對我好',
      options: [
        {
          text: '同意',
          type: 'accept',
          result: { message: '你終於明白了，\n太好了！', effect: 'fireworks' },
          next: 'q3',
        },
        { text: '普通', type: 'walk' },
        { text: '不同意', type: 'walk' },
      ],
      gatherAfter: 4,
    },

    q3: {
      label: '第 3 題',
      text: '我欣賞我的努力',
      options: [
        {
          text: '同意',
          type: 'accept',
          result: { message: '你的努力，\n值得被你自己好好欣賞。', effect: 'fireworks' },
          next: 'q4',
        },
        { text: '普通', type: 'shrink' },
        { text: '不同意', type: 'shrink' },
      ],
      stubborn: {
        after: 4,
        text: '不可能，連這個都要堅持...',
        button: '你管我',
        goto: 'hidden3',
      },
    },

    hidden3: {
      label: '隱藏題',
      text: '我就管你',
      options: [
        {
          text: '好',
          type: 'accept',
          result: { message: '這才差不多。', effect: 'fireworks' },
          next: 'q4',
        },
        {
          text: '不好',
          type: 'drop',
          hint: { shake: '也許可以搖晃看看', drag: '也許可以拖曳看看' },
          broken: '喔喔，這是你自己弄的',
        },
      ],
    },

    q4: {
      label: '第 4 題',
      text: '我值得好好休息，\n那不是廢或懶。',
      options: [
        {
          text: '同意',
          type: 'accept',
          result: { message: '休息不是偷懶，\n是在好好照顧自己。', effect: 'fireworks' },
          next: 'q5',
        },
        { text: '普通', type: 'crack' },
        { text: '不同意', type: 'crack' },
      ],
      crackAfter: 4,
      stubborn: {
        after: 4,
        text: '你為甚麼要這樣對自己？',
        button: '我也不知道',
        goto: 'hidden4',
      },
    },

    hidden4: {
      label: '隱藏題',
      text: '不知道也沒關係',
      mood: 'void',
      options: [
        {
          text: '好',
          type: 'accept',
          result: { message: '目前這樣就夠了。', effect: 'fireworks' },
          next: 'q5',
        },
        { text: '不好', type: 'tilt', after: 4, spin: '你旋轉我我就旋轉你' },
      ],
    },

    q5: {
      label: '第 5 題',
      text: '我不能相信任何人，\n靠自己最安全。',
      options: [
        {
          text: '同意',
          type: 'fade',
          confirm: { text: '確定嗎？', button: '沒錯', goto: 'hidden5' },
        },
        { text: '普通', type: 'accept', result: { message: '這樣也挺好的。', effect: 'fireworks' } },
        { text: '不同意', type: 'accept', result: { message: '這樣也挺好的。', effect: 'fireworks' } },
      ],
    },

    hidden5: {
      label: '隱藏題',
      text: '那要不要試著相信我？',
      options: [
        {
          text: '好',
          type: 'accept',
          result: { message: '耶！謝謝你，\n你也該謝謝你自己。', effect: 'fireworks' },
        },
        { text: '不好', type: 'accept', next: 'hidden5_really' },
      ],
    },

    hidden5_really: {
      label: '隱藏題',
      text: '真的嗎？',
      options: [
        { text: '對', type: 'accept', next: 'hidden5_please' },
        { text: '不對', type: 'accept', next: 'hidden5' },
      ],
    },

    hidden5_please: {
      label: '隱藏題',
      text: '拜託？',
      options: [
        { text: '好', type: 'accept', next: 'hidden5' },
        { text: '不好', type: 'accept', next: 'hidden5_hard' },
      ],
    },

    hidden5_hard: {
      label: '隱藏題',
      text: '真的真的嗎？',
      options: [
        { text: '對', type: 'accept', next: 'hidden5_fine' },
        { text: '不對', type: 'accept', next: 'hidden5' },
      ],
    },

    // 一開始沒有任何選項，等 6 秒後下一句話和按鈕才一起淡入
    hidden5_fine: {
      label: '隱藏題',
      text: '好吧...',
      late: { after: 6, text: '是不是在找什麼？' },
      options: [
        { text: '對', type: 'accept', next: 'hidden5_tease' },
      ],
    },

    hidden5_tease: {
      label: '隱藏題',
      text: '我偏不給你',
      options: [{ text: '...', type: 'accept', next: 'hidden5_angry' }],
    },

    hidden5_angry: {
      label: '隱藏題',
      text: '生氣了？',
      options: [
        { text: '對', type: 'accept', next: 'hidden5_again' },
        { text: '不對', type: 'accept', next: 'hidden5_again' },
      ],
    },

    hidden5_again: {
      label: '隱藏題',
      text: '那要不要試著相信我？',
      options: [
        {
          text: '好',
          type: 'accept',
          big: 5,
          result: { message: '耶！謝謝你，\n你也該謝謝你自己。', effect: 'fireworks' },
        },
        {
          text: '不好',
          type: 'accept',
          orbit: true,
          result: { message: '那記得改變心意的時候，\n再跟我說。' },
        },
      ],
    },
  },
};

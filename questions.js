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
 *     stubborn: （可省略）逃跑按鈕累積逃跑夠多次後，右下角出現的隱藏入口
 *       { after: 次數, text: 提示文字, button: 按鈕文字, goto: '題目代號' }
 *   }
 *
 * 範例：在第 1 題的「同意」加上 next: 'q2'，再新增一個 q2 題目，
 *       結果畫面就會出現「下一題」按鈕。
 */
window.QUIZ = {
  title: '小小心理測驗',
  intro: '只需要一點點時間，\n憑直覺回答就好。',
  startButton: '開始測驗',
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
        },
        { text: '不好', type: 'shatter' },
      ],
    },
  },
};

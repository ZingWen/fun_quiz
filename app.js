(() => {
  'use strict';

  const quiz = window.QUIZ;
  const app = document.getElementById('app');
  let cleanups = [];

  // 記住滑鼠最後的位置
  const lastPointer = { x: -9999, y: -9999 };
  const trackPointer = (e) => {
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
  };
  window.addEventListener('pointermove', trackPointer, true);
  window.addEventListener('pointerdown', trackPointer, true);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function show(screen, mood) {
    cleanups.forEach((fn) => fn());
    cleanups = [];
    document.body.classList.remove('night', 'warm');
    if (mood) document.body.classList.add(mood);
    app.replaceChildren(screen);
  }

  /* ---------- 畫面 ---------- */

  function showIntro() {
    const screen = el('section', 'screen');
    screen.append(el('h1', 'title', quiz.title), el('p', 'intro', quiz.intro));
    const start = el('button', 'btn', quiz.startButton || '開始');
    start.addEventListener('click', () => showQuestion(quiz.start));
    screen.append(start);
    show(screen);
  }

  function showQuestion(id) {
    const q = quiz.questions[id];
    if (!q) return showIntro();

    const screen = el('section', 'screen');
    if (q.label) screen.append(el('p', 'label', q.label));
    screen.append(el('h2', 'question', q.text));

    const options = el('div', 'options');
    const state = { flees: 0, toast: null };

    const walkBtns = [];
    let acceptBtn = null;
    let acceptAction = null;

    q.options.forEach((opt) => {
      const btn = el('button', 'btn', opt.text);
      btn.type = 'button';
      if (opt.type === 'walk') {
        walkBtns.push(btn);
      } else if (opt.type === 'flee') {
        setupFlee(btn, options, () => {
          state.flees += 1;
          if (q.stubborn && !state.toast && state.flees >= q.stubborn.after) {
            state.toast = showToast(q.stubborn);
          }
        });
      } else if (opt.type === 'shatter') {
        btn.addEventListener('click', () => shatter(btn), { once: true });
      } else {
        const action = () => {
          if (opt.result) showResult(opt);
          else showQuestion(opt.next);
        };
        btn.addEventListener('click', action);
        if (!acceptBtn) {
          acceptBtn = btn;
          acceptAction = action;
        }
      }
      options.append(btn);
    });

    if (walkBtns.length) {
      setupWalkers(walkBtns, options, acceptBtn, acceptAction, q.gatherAfter);
    }

    screen.append(options);
    show(screen);
    cleanups.push(() => state.toast && state.toast.remove());
  }

  function showResult(opt) {
    const { message, effect } = opt.result;
    const screen = el('section', 'screen');
    screen.append(el('p', 'message', message));

    const after = el('div', 'after');
    const btn = el('button', 'btn', opt.next ? '下一題' : '再測一次');
    btn.addEventListener('click', () => (opt.next ? showQuestion(opt.next) : showIntro()));
    after.append(btn);
    screen.append(after);

    show(screen, effect === 'fireworks' ? 'night' : effect === 'warm' ? 'warm' : null);
    if (effect === 'fireworks') {
      fireworks.start();
      cleanups.push(() => fireworks.stop());
    }
  }

  function showToast(cfg) {
    const toast = el('div', 'toast');
    toast.append(el('span', null, cfg.text));
    const btn = el('button', 'btn', cfg.button);
    btn.addEventListener('click', () => showQuestion(cfg.goto));
    toast.append(btn);
    document.body.append(toast);
    return toast;
  }

  /* ---------- 逃跑的按鈕 ---------- */

  function setupFlee(btn, container, onFlee) {
    btn.classList.add('flee');
    btn.tabIndex = -1; // 不讓鍵盤偷偷選到
    let tx = 0;
    let ty = 0;
    let lastFlee = 0;

    function flee(px, py) {
      const now = performance.now();
      if (now - lastFlee < 250) return;
      lastFlee = now;

      const rect = btn.getBoundingClientRect();
      const baseLeft = rect.left - tx;
      const baseTop = rect.top - ty;
      const pad = 16;
      const maxX = Math.max(pad, window.innerWidth - rect.width - pad);
      const maxY = Math.max(pad, window.innerHeight - rect.height - pad);
      const minDist = Math.min(220, Math.min(window.innerWidth, window.innerHeight) * 0.3);

      // 其他按鈕的位置，避免蓋住「同意」
      const others = [...container.children]
        .filter((b) => b !== btn)
        .map((b) => b.getBoundingClientRect());

      let nx = pad;
      let ny = pad;
      for (let i = 0; i < 40; i++) {
        nx = pad + Math.random() * (maxX - pad);
        ny = pad + Math.random() * (maxY - pad);
        const cx = nx + rect.width / 2;
        const cy = ny + rect.height / 2;
        const farEnough = Math.hypot(cx - px, cy - py) > minDist;
        const overlaps = others.some(
          (o) =>
            nx < o.right + 12 &&
            nx + rect.width > o.left - 12 &&
            ny < o.bottom + 12 &&
            ny + rect.height > o.top - 12
        );
        if (farEnough && !overlaps) break;
      }

      tx = nx - baseLeft;
      ty = ny - baseTop;
      btn.style.transform = `translate(${tx}px, ${ty}px)`;
      onFlee();
    }

    const center = () => {
      const r = btn.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    };

    // 題目剛出現時，如果按鈕剛好長在滑鼠底下，先不要逃；
    // 等滑鼠離開原地之後，再碰到才算數。
    const spawn = { ...lastPointer };
    let guard = true;
    const nearSpawn = (e) => Math.hypot(e.clientX - spawn.x, e.clientY - spawn.y) < 10;
    const onMove = (e) => {
      if (nearSpawn(e)) return;
      const r = btn.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) {
        guard = false;
        window.removeEventListener('pointermove', onMove);
      }
    };
    window.addEventListener('pointermove', onMove);
    cleanups.push(() => window.removeEventListener('pointermove', onMove));

    btn.addEventListener('pointerenter', (e) => {
      if (guard && e.pointerType === 'mouse') return;
      flee(e.clientX, e.clientY);
    });
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      flee(e.clientX, e.clientY);
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      flee(...center());
    });
    btn.addEventListener('focus', () => btn.blur());

    const onResize = () => {
      tx = 0;
      ty = 0;
      btn.style.transform = '';
    };
    window.addEventListener('resize', onResize);
    cleanups.push(() => window.removeEventListener('resize', onResize));
  }

  /* ---------- 長腳走掉的按鈕 ---------- */

  function currentTranslate(node) {
    const t = getComputedStyle(node).translate;
    if (!t || t === 'none') return [0, 0];
    const parts = t.split(' ').map(parseFloat);
    return [parts[0] || 0, parts[1] || 0];
  }

  function setupWalkers(btns, container, acceptBtn, onAccept, limit) {
    const SPEED = 110; // 每秒走幾 px
    const canGather = Boolean(acceptBtn && limit);
    let count = 0;
    let gathering = false;

    const walkers = btns.map((btn) => {
      btn.classList.add('walk');
      return { btn, token: 0, busy: false, arrived: false };
    });

    // 讓按鈕走到畫面上的 (nx, ny)（按鈕左上角的位置）
    function walkTo(w, nx, ny, done) {
      const token = ++w.token;
      const btn = w.btn;
      w.busy = true;

      const rect = btn.getBoundingClientRect();
      const [cx, cy] = currentTranslate(btn);
      const tx = nx - (rect.left - cx);
      const ty = ny - (rect.top - cy);
      const dist = Math.hypot(nx - rect.left, ny - rect.top);
      const duration = Math.min(4.5, Math.max(1.2, dist / SPEED));

      btn.classList.add('legs'); // 先把腳長出來
      setTimeout(() => {
        if (token !== w.token) return;
        btn.classList.add('walking');
        btn.style.setProperty('--walk-time', `${duration}s`);
        btn.style.translate = `${tx}px ${ty}px`;
        setTimeout(() => {
          if (token !== w.token) return;
          btn.classList.remove('walking', 'legs'); // 到了，把腳收起來
          w.busy = false;
          if (done) done();
        }, duration * 1000 + 60);
      }, 380);
    }

    function randomSpot(btn) {
      const rect = btn.getBoundingClientRect();
      const pad = 16;
      const maxX = window.innerWidth - rect.width - pad;
      const maxY = window.innerHeight - rect.height - pad - 16; // 留位置給腳
      const others = [...container.children]
        .filter((b) => b !== btn)
        .map((b) => b.getBoundingClientRect());
      const overlaps = (x, y) =>
        others.some(
          (o) =>
            x < o.right + 12 &&
            x + rect.width > o.left - 12 &&
            y < o.bottom + 12 &&
            y + rect.height > o.top - 12
        );

      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const d = 140 + Math.random() * 220;
        const x = rect.left + Math.cos(angle) * d;
        const y = rect.top + Math.sin(angle) * d;
        if (x < pad || x > maxX || y < pad || y > maxY) continue;
        if (!overlaps(x, y)) return [x, y];
      }
      return [
        pad + Math.random() * Math.max(0, maxX - pad),
        pad + Math.random() * Math.max(0, maxY - pad),
      ];
    }

    function acceptSpot(btn) {
      const a = acceptBtn.getBoundingClientRect();
      const r = btn.getBoundingClientRect();
      return [a.left + (a.width - r.width) / 2, a.top + (a.height - r.height) / 2];
    }

    // 比「同意」寬的按鈕，躲好後伸出兩隻手把自己壓窄，才不會露出來
    function squeeze(btn) {
      const ratio = acceptBtn.offsetWidth / btn.offsetWidth;
      if (ratio >= 0.99) return;
      const hands = ['left', 'right'].map((side) => {
        const hand = el('span', `hand ${side}`);
        btn.append(hand);
        return hand;
      });
      void btn.offsetWidth;
      btn.classList.add('hands'); // 手伸出來
      setTimeout(() => {
        btn.style.scale = `${ratio} 1`; // 往內壓
      }, 400);
      setTimeout(() => btn.classList.remove('hands'), 1150); // 手收回去
      setTimeout(() => hands.forEach((hand) => hand.remove()), 1500);
    }

    walkers.forEach((w) => {
      w.btn.addEventListener('click', () => {
        if (gathering) {
          if (w.arrived) onAccept(); // 躲在「同意」後面時，點到一律算同意
          return;
        }
        if (w.busy) return;
        count += 1;
        if (canGather && count >= limit) {
          gathering = true;
          acceptBtn.classList.add('cover');
          walkers.forEach((x) => {
            walkTo(x, ...acceptSpot(x.btn), () => {
              x.arrived = true;
              squeeze(x.btn);
            });
          });
        } else {
          walkTo(w, ...randomSpot(w.btn));
        }
      });
    });

    const onResize = () => {
      walkers.forEach((w) => {
        w.token += 1;
        w.busy = false;
        w.btn.classList.remove('walking', 'legs');
        w.btn.style.setProperty('--walk-time', '0s');
        w.btn.style.translate = '';
        if (gathering) {
          const [x, y] = acceptSpot(w.btn);
          const r = w.btn.getBoundingClientRect();
          w.btn.style.translate = `${x - r.left}px ${y - r.top}px`;
          w.arrived = true;
        }
      });
    };
    window.addEventListener('resize', onResize);
    cleanups.push(() => window.removeEventListener('resize', onResize));
  }

  /* ---------- 碎掉的按鈕 ---------- */

  function shatter(btn) {
    const rect = btn.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cols = 6;
    const rows = 3;

    // 帶點隨機的格點，讓裂痕不那麼整齊
    const pts = [];
    for (let r = 0; r <= rows; r++) {
      pts.push([]);
      for (let c = 0; c <= cols; c++) {
        const jx = c === 0 || c === cols ? 0 : (Math.random() - 0.5) * (w / cols) * 0.7;
        const jy = r === 0 || r === rows ? 0 : (Math.random() - 0.5) * (h / rows) * 0.7;
        pts[r].push([(c / cols) * w + jx, (r / rows) * h + jy]);
      }
    }

    const makeShard = (tri) => {
      const shard = el('div', 'btn shard', btn.textContent);
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
      const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      Object.assign(shard.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${w}px`,
        height: `${h}px`,
        clipPath: `polygon(${tri.map((p) => `${p[0]}px ${p[1]}px`).join(', ')})`,
        transformOrigin: `${cx}px ${cy}px`,
      });
      document.body.append(shard);

      const dx = (cx - w / 2) * (1 + Math.random() * 1.5) + (Math.random() - 0.5) * 60;
      const up = -(15 + Math.random() * 45);
      const fall = 220 + Math.random() * 260;
      const rot = (Math.random() - 0.5) * 540;
      shard
        .animate(
          [
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
            {
              transform: `translate(${dx * 0.5}px, ${up}px) rotate(${rot * 0.3}deg)`,
              opacity: 1,
              offset: 0.3,
              easing: 'ease-in',
            },
            { transform: `translate(${dx}px, ${fall}px) rotate(${rot}deg)`, opacity: 0 },
          ],
          { duration: 900 + Math.random() * 600, easing: 'ease-out', fill: 'forwards' }
        )
        .finished.then(() => shard.remove());
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = pts[r][c];
        const b = pts[r][c + 1];
        const d = pts[r + 1][c];
        const e = pts[r + 1][c + 1];
        if (Math.random() < 0.5) {
          makeShard([a, b, d]);
          makeShard([b, e, d]);
        } else {
          makeShard([a, b, e]);
          makeShard([a, e, d]);
        }
      }
    }

    // 原本的按鈕消失，並讓剩下的按鈕慢慢置中
    btn.disabled = true;
    btn.style.width = `${w}px`;
    btn.classList.add('collapsing');
    void btn.offsetWidth;
    Object.assign(btn.style, { width: '0', margin: '0', padding: '0', borderWidth: '0' });
    setTimeout(() => btn.remove(), 600);
  }

  /* ---------- 煙火 ---------- */

  const fireworks = (() => {
    const canvas = document.getElementById('fireworks');
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rockets = [];
    let sparks = [];
    let running = false;
    let frame = 0;
    let startedAt = 0;
    let nextLaunch = 0;
    let W = 0;
    let H = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function launch() {
      rockets.push({
        x: W * (0.15 + Math.random() * 0.7),
        y: H + 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(Math.sqrt(H) * (0.42 + Math.random() * 0.12)),
        hue: Math.random() * 360,
      });
    }

    function explode(rocket) {
      const count = 70 + Math.floor(Math.random() * 50);
      const power = 3 + Math.random() * 3;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = power * (0.3 + Math.random() * 0.7);
        sparks.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          hue: rocket.hue + (Math.random() - 0.5) * 40,
          life: 1,
          decay: 0.008 + Math.random() * 0.012,
        });
      }
    }

    function tick(now) {
      if (!running) return;
      frame = requestAnimationFrame(tick);

      // 讓舊的軌跡慢慢淡掉
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      if (now >= nextLaunch) {
        const opening = now - startedAt < 6000; // 一開始比較熱鬧
        const burst = reduced ? 1 : opening ? 1 + Math.floor(Math.random() * 3) : 1;
        for (let i = 0; i < burst; i++) launch();
        nextLaunch = now + (reduced ? 2500 : opening ? 350 + Math.random() * 400 : 900 + Math.random() * 1200);
      }

      rockets = rockets.filter((r) => {
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.12;
        ctx.fillStyle = `hsl(${r.hue}, 90%, 75%)`;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fill();
        if (r.vy >= -1) {
          explode(r);
          return false;
        }
        return true;
      });

      sparks = sparks.filter((s) => {
        s.vx *= 0.985;
        s.vy = s.vy * 0.985 + 0.045;
        s.x += s.vx;
        s.y += s.vy;
        s.life -= s.decay;
        if (s.life <= 0) return false;
        ctx.fillStyle = `hsla(${s.hue}, 95%, 65%, ${s.life})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
    }

    return {
      start() {
        if (running) return;
        running = true;
        resize();
        window.addEventListener('resize', resize);
        startedAt = performance.now();
        nextLaunch = startedAt + 300;
        frame = requestAnimationFrame(tick);
      },
      stop() {
        running = false;
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', resize);
        rockets = [];
        sparks = [];
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, W, H);
      },
    };
  })();

  showIntro();
})();

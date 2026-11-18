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
    document.body.classList.remove('night', 'warm', 'void');
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
    const heading = el('h2', 'question', q.text);
    screen.append(heading);

    const options = el('div', 'options');
    // 晚一點才淡入的文字和選項（位置先留好，出現時畫面不會跳動）
    const lateNodes = [];
    if (q.late) {
      if (q.late.text) {
        const more = el('span', 'late-text late', q.late.text);
        heading.append(more);
        lateNodes.push(more);
      }
      options.classList.add('late');
      lateNodes.push(options);
    }
    const state = { stubborn: 0, stubbornShown: false, toast: null };

    // 右下角同一時間只放一個提示
    const setToast = (cfg) => {
      if (state.toast) state.toast.remove();
      state.toast = showToast(cfg);
    };
    // 逃跑、縮小都算「堅持」，累積夠多次就出現隱藏入口
    const bumpStubborn = () => {
      state.stubborn += 1;
      if (q.stubborn && !state.stubbornShown && state.stubborn >= q.stubborn.after) {
        state.stubbornShown = true;
        setToast(q.stubborn);
      }
    };

    const walkBtns = [];
    const orbitBtns = [];
    let acceptBtn = null;
    let acceptAction = null;
    let crack = null; // 所有 'crack' 按鈕共用同一片裂開的畫面

    q.options.forEach((opt) => {
      const btn = el('button', 'btn', opt.text);
      btn.type = 'button';
      if (opt.big) {
        btn.classList.add('big');
        btn.style.setProperty('--big', opt.big);
      }
      if (opt.orbit) orbitBtns.push(btn);
      if (opt.type === 'fade') {
        btn.addEventListener(
          'click',
          () => {
            btn.disabled = true;
            btn.classList.add('fading');
            if (opt.confirm) setToast(opt.confirm);
          },
          { once: true }
        );
      } else if (opt.type === 'walk') {
        walkBtns.push(btn);
      } else if (opt.type === 'crack') {
        if (!crack) crack = makeCrack(screen, q.crackAfter || 4, bumpStubborn);
        btn.addEventListener('click', (e) => crack.hit(e, btn));
      } else if (opt.type === 'tilt') {
        setupTilt(btn, opt.after || 4, () => opt.spin && setToast({ text: opt.spin }));
      } else if (opt.type === 'flee') {
        setupFlee(btn, options, bumpStubborn);
      } else if (opt.type === 'shrink') {
        setupShrink(btn, bumpStubborn);
      } else if (opt.type === 'drop') {
        const touch = window.matchMedia('(pointer: coarse)').matches;
        const hint = opt.hint || {};
        let hinted = false;
        setupDrop(btn, {
          onLanded() {
            const text = touch ? hint.shake : hint.drag;
            if (hinted || !text) return;
            hinted = true;
            setToast({ text });
          },
          onBroken() {
            if (opt.broken) setToast({ text: opt.broken });
          },
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
    show(screen, q.mood);

    // 繞圈的按鈕：繞著放大的那顆（沒有的話就繞第一顆別的按鈕）
    // 要在 show() 之後才啟動，不然動畫會被 show() 的清理動作馬上停掉
    orbitBtns.forEach((btn, i) => {
      const others = [...options.children].filter((b) => !orbitBtns.includes(b));
      const target = others.find((b) => b.classList.contains('big')) || others[0];
      if (target) setupOrbit(btn, target, (i / orbitBtns.length) * Math.PI * 2);
    });
    cleanups.push(() => state.toast && state.toast.remove());
    if (crack) cleanups.push(crack.destroy);
    if (q.late) {
      const timer = setTimeout(
        () => lateNodes.forEach((node) => node.classList.add('shown')),
        q.late.after * 1000
      );
      cleanups.push(() => clearTimeout(timer));
    }
    if (q.auto) {
      const timer = setTimeout(() => showQuestion(q.auto.goto), q.auto.after * 1000);
      cleanups.push(() => clearTimeout(timer));
    }
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
    const toast = el('div', cfg.button ? 'toast' : 'toast plain');
    toast.append(el('span', null, cfg.text));
    if (cfg.button) {
      const btn = el('button', 'btn', cfg.button);
      btn.addEventListener('click', () => showQuestion(cfg.goto));
      toast.append(btn);
    }
    document.body.append(toast);
    return toast;
  }

  /* ---------- 繞著別的按鈕快速轉圈的按鈕 ---------- */

  // 還是可以點，只是要抓得到。
  function setupOrbit(btn, target, phase) {
    btn.classList.add('orbit');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPEED = ((Math.PI * 2) / 2.1) * (reduced ? 0.15 : 1); // 一圈約 2.1 秒
    const GAP = 14;
    let angle = phase - Math.PI / 2;
    let last = performance.now();
    let frame = 0;

    const step = (now) => {
      angle += SPEED * Math.min(0.05, (now - last) / 1000);
      last = now;
      const r = target.getBoundingClientRect();
      const w = btn.offsetWidth;
      const h = btn.offsetHeight;
      let x = r.left + r.width / 2 + Math.cos(angle) * (r.width / 2 + w / 2 + GAP) - w / 2;
      let y = r.top + r.height / 2 + Math.sin(angle) * (r.height / 2 + h / 2 + GAP) - h / 2;
      // 不要跑出畫面
      x = Math.min(Math.max(4, x), Math.max(4, window.innerWidth - w - 4));
      y = Math.min(Math.max(4, y), Math.max(4, window.innerHeight - h - 4));
      btn.style.transform = `translate(${x}px, ${y}px)`;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    cleanups.push(() => cancelAnimationFrame(frame));

    // 按下去的瞬間就算數：按鈕跑太快，等到放開時它已經不在游標底下，
    // 瀏覽器就不會把這次當成點擊。
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.click();
    });
  }

  /* ---------- 越按越小的按鈕 ---------- */

  function setupShrink(btn, onShrink) {
    btn.classList.add('shrink');
    let scale = 1;
    btn.addEventListener('click', () => {
      scale = Math.max(0.12, scale * 0.72);
      btn.style.scale = String(scale);
      onShrink();
    });
  }

  /* ---------- 越按越歪、最後轉起來的按鈕 ---------- */

  function setupTilt(btn, after, onSpin) {
    btn.classList.add('tilt');
    let count = 0;
    let angle = 0;
    let spinning = false;
    let frame = 0;

    function spin() {
      spinning = true;
      btn.classList.add('spinning');
      let speed = 40; // 度/秒
      let last = performance.now();
      const step = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        speed = Math.min(2400, speed + (120 + speed * 0.9) * dt); // 越轉越快
        angle += speed * dt;
        btn.style.rotate = `${angle % 360}deg`;
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
      onSpin();
    }

    btn.addEventListener('click', () => {
      if (spinning) return;
      count += 1;
      angle += 6 + (count - 1) * 4; // 6、16、30、48 度…一次比一次歪
      btn.style.rotate = `${angle}deg`;
      if (count >= after) setTimeout(spin, 450);
    });
    cleanups.push(() => cancelAnimationFrame(frame));
  }

  /* ---------- 裂開的畫面 ---------- */

  // 從第一次點擊的位置往外裂。每點一次多裂一點，點到 limit 次整個畫面碎掉落下。
  // onCount 每點一次呼叫一次；最後一次會等碎片掉完才呼叫。
  function makeCrack(screen, limit, onCount) {
    const NS = 'http://www.w3.org/2000/svg';
    let count = 0;
    let broken = false;
    let geo = null;
    let svg = null;
    let timers = [];
    const pieces = [];

    function build(cx, cy) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.25;
      const n = 9 + Math.floor(Math.random() * 3);
      const base = Math.random() * Math.PI * 2;
      const rings = [0.1, 0.28, 0.55, 1];
      const angles = Array.from(
        { length: n },
        (_, i) => base + ((i + (Math.random() - 0.5) * 0.6) * Math.PI * 2) / n
      );
      // pts[i][j]：第 i 條放射裂痕和第 j 圈的交點
      const pts = angles.map((a) =>
        rings.map((f, j) => {
          const r = f * R * (j === rings.length - 1 ? 1 : 0.75 + Math.random() * 0.5);
          return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        })
      );
      geo = { cx, cy, n, m: rings.length, pts, W, H };

      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'cracks');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('aria-hidden', 'true');
      document.body.append(svg);
    }

    function line(a, b, stage) {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`);
      path.setAttribute('pathLength', '1');
      path.dataset.stage = stage;
      svg.append(path);
    }

    // 依照第幾下，畫出該出現的裂痕
    function drawStage(stage) {
      const { cx, cy, n, pts } = geo;
      const c = [cx, cy];
      for (let i = 0; i < n; i++) {
        const next = pts[(i + 1) % n];
        const ray = pts[i];
        if (stage === 1) {
          if (i % 2 === 0 || Math.random() < 0.3) {
            line(c, ray[0], 1);
            line(ray[0], ray[1], 1);
          }
        } else if (stage === 2) {
          line(c, ray[0], 2);
          line(ray[0], ray[1], 2);
          line(ray[1], ray[2], 2);
          line(ray[0], next[0], 2);
        } else if (stage === 3) {
          line(ray[2], ray[3], 3);
          line(ray[1], next[1], 3);
          if (Math.random() < 0.5) line(ray[2], next[2], 3);
        }
      }
      // 下一個畫面更新時才開始畫，才看得到裂開的過程
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          svg.querySelectorAll(`[data-stage="${stage}"]`).forEach((p) => p.classList.add('on'));
        })
      );
    }

    function polygons() {
      const { cx, cy, n, m, pts } = geo;
      const list = [];
      for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        list.push([[cx, cy], a[0], b[0]]);
        for (let j = 0; j < m - 1; j++) list.push([a[j], b[j], b[j + 1], a[j + 1]]);
      }
      return list;
    }

    // 整個畫面碎成好幾片掉下去
    function shatterScreen() {
      broken = true;
      const bg = getComputedStyle(document.body).backgroundColor;
      const { cx, cy, H } = geo;
      let longest = 0;

      polygons().forEach((poly) => {
        const piece = el('div', 'crack-piece');
        piece.style.background = bg;
        const clone = screen.cloneNode(true);
        const holder = el('div', 'app-clone');
        holder.append(clone);
        piece.append(holder);

        const px = poly.reduce((s, p) => s + p[0], 0) / poly.length;
        const py = poly.reduce((s, p) => s + p[1], 0) / poly.length;
        piece.style.clipPath = `polygon(${poly.map((p) => `${p[0]}px ${p[1]}px`).join(', ')})`;
        piece.style.transformOrigin = `${px}px ${py}px`;
        document.body.append(piece);
        pieces.push(piece);

        const dx = (px - cx) * 0.12 + (Math.random() - 0.5) * 60;
        const rot = (Math.random() - 0.5) * 50;
        const delay = Math.random() * 350 + (Math.hypot(px - cx, py - cy) < 120 ? 0 : 120);
        const duration = 1100 + Math.random() * 600;
        longest = Math.max(longest, delay + duration);
        piece.animate(
          [
            { transform: 'translate(0, 0) rotate(0deg)' },
            { transform: `translate(${dx * 0.1}px, 6px) rotate(${rot * 0.05}deg)`, offset: 0.08 },
            { transform: `translate(${dx}px, ${H * 1.3}px) rotate(${rot}deg)` },
          ],
          { duration, delay, easing: 'cubic-bezier(0.55, 0, 0.85, 0.5)', fill: 'forwards' }
        );
      });

      // 碎片後面已經是一片黑
      screen.style.visibility = 'hidden';
      if (svg) svg.remove();
      document.body.classList.add('void');

      timers.push(
        setTimeout(() => {
          pieces.forEach((p) => p.remove());
          onCount();
        }, longest + 100)
      );
    }

    function hit(e, btn) {
      if (broken) return;
      if (!geo) {
        let x = e.clientX;
        let y = e.clientY;
        if (!e.detail) {
          const r = btn.getBoundingClientRect(); // 用鍵盤按的
          x = r.left + r.width / 2;
          y = r.top + r.height / 2;
        }
        build(x, y);
      }
      count += 1;
      app.animate(
        [
          { translate: '0 0' },
          { translate: '-5px 3px' },
          { translate: '4px -2px' },
          { translate: '0 0' },
        ],
        { duration: 220 }
      );
      if (count >= limit) {
        timers.push(setTimeout(shatterScreen, 180));
        return;
      }
      drawStage(count);
      onCount();
    }

    function destroy() {
      timers.forEach(clearTimeout);
      pieces.forEach((p) => p.remove());
      if (svg) svg.remove();
    }

    return { hit, destroy };
  }

  /* ---------- 掉到地上的按鈕 ---------- */

  // 點了之後掉到畫面底部。之後拖曳它、或搖晃手機，它都會「用力過猛」
  // 撞到畫面邊界然後碎掉。
  function setupDrop(btn, hooks) {
    const GRAVITY = 2600; // px/s²
    const OVERSHOOT = 1.6; // 拖曳時比手指多跑多少
    let mode = 'idle'; // idle | falling | resting | dragging | thrown | broken
    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;
    let w = 0;
    let h = 0;
    let frame = 0;
    let last = 0;

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const maxX = () => Math.max(0, window.innerWidth - w);
    const maxY = () => Math.max(0, window.innerHeight - h);
    const place = () => {
      btn.style.left = `${x}px`;
      btn.style.top = `${y}px`;
    };

    function breakIt() {
      mode = 'broken';
      cancelAnimationFrame(frame);
      window.removeEventListener('devicemotion', onMotion);
      shatter(btn);
      hooks.onBroken();
    }

    function step(now) {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;

      const mx = maxX();
      const my = maxY();
      const hitSide = x <= 0 || x >= mx;
      const hitTop = y <= 0;
      const hitFloor = y >= my;
      x = clamp(x, 0, mx);
      y = clamp(y, 0, my);
      place();

      if (mode === 'thrown' && (hitSide || hitTop || hitFloor)) return breakIt();

      // 自己掉下來的時候只會彈一彈
      if (hitSide) vx *= -0.4;
      if (hitTop) vy = Math.abs(vy) * 0.4;
      if (hitFloor) {
        vy *= -0.35;
        vx *= 0.8;
        if (Math.abs(vy) < 140) {
          vx = 0;
          vy = 0;
          mode = 'resting';
          hooks.onLanded();
          return;
        }
      }
      frame = requestAnimationFrame(step);
    }

    function run(nextMode) {
      mode = nextMode;
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(step);
    }

    // 往 (dx, dy) 的方向用力甩出去
    function throwToward(dx, dy, minSpeed) {
      const len = Math.hypot(dx, dy) || 1;
      const speed = Math.max(minSpeed, len);
      vx = (dx / len) * speed;
      vy = (dy / len) * speed;
      run('thrown');
    }

    // 搖晃手機
    let prevG = null;
    function onMotion(e) {
      if (mode !== 'resting') return;
      let ax = 0;
      let strength = 0;
      const a = e.acceleration;
      if (a && a.x != null) {
        ax = a.x;
        strength = Math.hypot(a.x, a.y || 0, a.z || 0);
      } else if (e.accelerationIncludingGravity) {
        const g = e.accelerationIncludingGravity;
        if (prevG) {
          ax = g.x - prevG.x;
          strength = Math.hypot(g.x - prevG.x, g.y - prevG.y, g.z - prevG.z);
        }
        prevG = { x: g.x || 0, y: g.y || 0, z: g.z || 0 };
      }
      if (strength < 13) return;
      const side = -Math.sign(ax) || (Math.random() < 0.5 ? -1 : 1);
      throwToward(side * (0.6 + Math.random() * 0.8), -1, 2000);
    }

    btn.addEventListener(
      'click',
      () => {
        // iOS 要在使用者點擊的當下要求動作感測權限
        const DM = window.DeviceMotionEvent;
        if (DM && typeof DM.requestPermission === 'function') {
          DM.requestPermission().catch(() => {});
        }
        window.addEventListener('devicemotion', onMotion);
        cleanups.push(() => {
          cancelAnimationFrame(frame);
          window.removeEventListener('devicemotion', onMotion);
        });

        const r = btn.getBoundingClientRect();
        w = r.width;
        h = r.height;
        x = r.left;
        y = r.top;
        btn.classList.add('dropped');
        btn.blur();
        place();
        vx = (Math.random() - 0.5) * 120;
        vy = 0;
        run('falling');
      },
      { once: true }
    );

    // 拖曳
    btn.addEventListener('pointerdown', (e) => {
      if (mode !== 'resting' && mode !== 'falling') return;
      e.preventDefault();
      cancelAnimationFrame(frame);
      mode = 'dragging';
      btn.setPointerCapture(e.pointerId);

      const sx = e.clientX;
      const sy = e.clientY;
      const ox = x;
      const oy = y;
      let lifted = false; // 離開過邊界之後，再碰到邊界就碎
      let samples = [{ t: performance.now(), x: sx, y: sy }];

      const end = () => {
        btn.removeEventListener('pointermove', onMove);
        btn.removeEventListener('pointerup', onUp);
        btn.removeEventListener('pointercancel', onUp);
      };

      const onMove = (ev) => {
        const rawX = ox + (ev.clientX - sx) * OVERSHOOT;
        const rawY = oy + (ev.clientY - sy) * OVERSHOOT;
        const mx = maxX();
        const my = maxY();
        const touching = rawX <= 0 || rawX >= mx || rawY <= 0 || rawY >= my;
        x = clamp(rawX, 0, mx);
        y = clamp(rawY, 0, my);
        place();

        const now = performance.now();
        samples.push({ t: now, x: ev.clientX, y: ev.clientY });
        samples = samples.filter((s) => now - s.t < 100);

        if (!touching) lifted = true;
        else if (lifted) {
          end();
          breakIt();
        }
      };

      const onUp = () => {
        end();
        if (mode !== 'dragging') return;
        const moved = Math.hypot(x - ox, y - oy);
        if (moved < 6) return run('falling'); // 只是按一下，掉回地上

        // 放手的瞬間再「不小心」多用一點力
        const first = samples[0];
        const lastS = samples[samples.length - 1];
        const dt = Math.max(0.016, (lastS.t - first.t) / 1000);
        let dx = ((lastS.x - first.x) / dt) * OVERSHOOT * 2;
        let dy = ((lastS.y - first.y) / dt) * OVERSHOOT * 2;
        if (Math.hypot(dx, dy) < 50) {
          dx = x - ox;
          dy = y - oy;
        }
        throwToward(dx, dy, 2200);
      };

      btn.addEventListener('pointermove', onMove);
      btn.addEventListener('pointerup', onUp);
      btn.addEventListener('pointercancel', onUp);
    });

    const onResize = () => {
      if (mode !== 'resting') return;
      x = clamp(x, 0, maxX());
      y = maxY();
      place();
    };
    window.addEventListener('resize', onResize);
    cleanups.push(() => window.removeEventListener('resize', onResize));
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

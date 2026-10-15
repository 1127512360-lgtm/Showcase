/* ==========================================================================
   进场加载动画（版本 2 · 无限卷轴）

   · 黑底上一条无限卷动的作品带，每张卡片按到画面中心的距离做
     rotateY(±30°) + 缩放 + translateZ —— 像书页向两侧扇开
   · 四周个人信息 / 稀疏彩色圆点 / 底部进度条由 style.css 的 16 节负责
   · 同一个会话只播一次（sessionStorage）；想强制看一次：在网址后加 ?intro=1
   · 系统开「减少动态效果」→ 直接跳过，不做动画
   · 任何异常都会走 bail()：立刻撤掉遮罩，绝不能把首页挡死

   改参数：下面的 DURATION / FADE / IMAGES / DOT_COLORS / AMP
   ========================================================================== */
(function () {
  var el = document.getElementById('intro');
  if (!el) return;

  var root = document.documentElement;
  var DURATION = 3000;      // 总时长（毫秒）
  var FADE = 500;           // 收尾淡出（毫秒），CSS 的 transition 与它一致
  var AMP = 1;              // 卷动倍率：1 = 3 秒正好走完一组（7 张）
  var IMAGES = [
    'assets/img/hero/hero-01.jpg', 'assets/img/hero/hero-02.jpg',
    'assets/img/hero/hero-03.jpg', 'assets/img/hero/hero-04.jpg',
    'assets/img/hero/hero-05.jpg', 'assets/img/hero/hero-06.jpg',
    'assets/img/hero/hero-07.jpg',
  ];
  // 圆点：以主色橙为主，掺几颗冷暖色，整体保持「稀疏」
  var DOT_COLORS = [
    ['#e2542b', 0.85], ['#e2542b', 0.6], ['#ff8f6b', 0.5],
    ['#7c9cff', 0.5], ['#ffd27a', 0.45], ['#ff9fc0', 0.45], ['#f2f0ec', 0.26],
  ];
  var DOT_COUNT = 26;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var raf = 0;
  var timers = [];
  var finished = false;

  function clearTimers() { timers.forEach(clearTimeout); timers.length = 0; }

  function finish(remove) {
    if (finished) return;
    finished = true;
    clearTimers();
    cancelAnimationFrame(raf);
    el.classList.add('is-done');
    root.classList.remove('is-intro');
    timers.push(setTimeout(function () {
      if (remove !== false) el.remove();
    }, FADE + 80));
  }

  /* 出任何岔子都别把首页挡住 */
  function bail() { finish(true); }

  try {
    // 只播一次：本次会话已经看过就撤掉遮罩
    var forced = /[?&]intro=1/.test(location.search);
    var seen = false;
    try { seen = sessionStorage.getItem('pf-intro') === '1'; } catch (e) { seen = false; }
    if (reduce.matches || (seen && !forced)) {
      root.classList.remove('is-intro');
      el.remove();
      return;
    }
    try { sessionStorage.setItem('pf-intro', '1'); } catch (e) { /* 隐私模式忽略 */ }

    root.classList.add('is-intro');

    /* ── 组装：作品带（两组，滚动一组即无缝）+ 圆点 ─────────────────── */
    var track = document.createElement('div');
    track.className = 'intro__track';
    var cards = [];
    for (var s = 0; s < 2; s += 1) {
      IMAGES.forEach(function (src, i) {
        var card = document.createElement('div');
        card.className = 'intro__card';
        var img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.decoding = 'async';
        if (i === 0 && s === 0) img.fetchPriority = 'high';
        var no = document.createElement('i');
        no.textContent = String(i + 1).padStart(2, '0');
        card.appendChild(img);
        card.appendChild(no);
        track.appendChild(card);
        cards.push(card);
      });
    }
    el.querySelector('[data-intro-track]').appendChild(track);

    var dots = el.querySelector('[data-intro-dots]');
    var rand = mulberry(20261015);            // 固定种子：每次播放圆点位置一致
    for (var d = 0; d < DOT_COUNT; d += 1) {
      var pick = DOT_COLORS[Math.floor(rand() * DOT_COLORS.length)];
      var size = 3 + Math.round(rand() * 5);
      var edge = rand();
      var x;
      var y;
      if (edge < 0.34) {                       // 左带 / 右带
        x = rand() < 0.5 ? 3 + rand() * 16 : 81 + rand() * 16;
        y = 8 + rand() * 84;
      } else if (edge < 0.62) {                // 上带 / 下带
        x = 6 + rand() * 88;
        y = rand() < 0.5 ? 5 + rand() * 14 : 81 + rand() * 14;
      } else {                                 // 其余散在主体之外的空隙
        x = 18 + rand() * 64;
        y = 10 + rand() * 80;
      }
      var dot = document.createElement('span');
      dot.className = 'intro__dot';
      dot.style.cssText = 'left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;width:' + size +
        'px;height:' + size + 'px;background:' + pick[0] + ';--o:' + pick[1] +
        ';transition-delay:' + (0.15 + rand() * 0.9).toFixed(2) + 's' +
        ';animation-delay:' + (-rand() * 6).toFixed(2) + 's';
      dots.appendChild(dot);
    }

    /* ── 每帧按「离中心的卡片数」摆正/扇开每张卡 ─────────────────────── */
    function paint(progress) {
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap) || 0;
      var cardW = cards[0].getBoundingClientRect().width + gap;
      var shift = -cardW * IMAGES.length * progress * AMP;
      track.style.transform = 'translate3d(' + shift.toFixed(1) + 'px,0,0)';

      var cx = window.innerWidth / 2;
      var rects = cards.map(function (card) { return card.getBoundingClientRect(); }); // 先读
      cards.forEach(function (card, i) {                                              // 后写
        var k = Math.max(-1.6, Math.min(1.6, (rects[i].left + rects[i].width / 2 - cx) / cardW));
        var ry = k * 30;
        var scale = 1.08 - Math.min(Math.abs(k), 1.6) * 0.11;
        var z = (1 - Math.min(Math.abs(k) / 1.6, 1)) * 46;
        card.style.transform = 'translateZ(' + z.toFixed(1) + 'px) rotateY(' + ry.toFixed(2) +
          'deg) scale(' + scale.toFixed(3) + ')';
        card.style.opacity = String(1 - Math.min(Math.abs(k) / 2.6, 1) * 0.55);
      });
    }

    /* ── 播放 ────────────────────────────────────────────────────────── */
    paint(0);
    void el.offsetWidth;
    el.classList.add('is-in', 'is-run');

    var t0 = performance.now();
    var tick = function (now) {
      var p = Math.min(1, (now - t0) / (DURATION - FADE));
      var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   // 缓入缓出
      paint(eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    timers.push(setTimeout(function () { finish(true); }, DURATION));
    timers.push(setTimeout(function () { bail(); }, DURATION + 2000));   // 保险丝

    window.addEventListener('beforeunload', function () { root.classList.remove('is-intro'); });
  } catch (e) {
    bail();
  }

  /* 固定种子的伪随机：同一个种子每次给出同一串数 */
  function mulberry(seed) {
    return function next() {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
})();

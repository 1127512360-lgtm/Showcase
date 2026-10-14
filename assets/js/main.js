/* ==========================================================================
   Portfolio — interactions
   01 语言切换 · 02 惯性滚动 · 03 首屏滚动放大 · 04 视差 · 05 入场揭示
   06 自定义光标 · 07 滚动进度 · 08 年份
   全部为原生实现，无第三方依赖；已适配 prefers-reduced-motion 与触屏设备。
   ========================================================================== */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)');

  /* --- 01 语言切换 ------------------------------------------------------- */
  const setLang = (lang) => {
    const next = lang === 'zh' ? 'zh' : 'en';
    doc.setAttribute('data-lang', next);
    doc.setAttribute('lang', next === 'zh' ? 'zh-CN' : 'en');
    try { localStorage.setItem('pf-lang', next); } catch (_) {}
  };

  $$('[data-lang-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const current = doc.getAttribute('data-lang') === 'zh' ? 'zh' : 'en';
      setLang(current === 'zh' ? 'en' : 'zh');
    });
  });

  /* --- 02 惯性滚动（滚轮） ------------------------------------------------ */
  const smooth = {
    enabled: !reduce.matches && !coarse.matches,
    target: window.scrollY,
    current: window.scrollY,
    written: window.scrollY,
  };

  let kickSmooth = () => {};

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  if (smooth.enabled) {
    doc.classList.add('is-smooth');
    let running = false;

    const step = () => {
      smooth.target = clamp(smooth.target, 0, maxScroll());
      const delta = smooth.target - smooth.current;

      if (Math.abs(delta) < 0.35) smooth.current = smooth.target;
      else smooth.current = lerp(smooth.current, smooth.target, 0.135);

      if (Math.abs(smooth.current - smooth.written) > 0.1) {
        smooth.written = smooth.current;
        window.scrollTo(0, smooth.current);
      }

      applyScroll();

      if (Math.abs(smooth.target - smooth.current) > 0.35) {
        requestAnimationFrame(step);
      } else {
        running = false;
      }
    };

    const kick = () => {
      if (running) return;
      running = true;
      requestAnimationFrame(step);
    };
    kickSmooth = kick;

    window.addEventListener(
      'wheel',
      (e) => {
        // 交给浏览器：缩放、横向手势、按住修饰键的情况
        if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
        smooth.target = clamp(smooth.target + e.deltaY * unit, 0, maxScroll());
        kick();
      },
      { passive: false }
    );

    // 原生滚动（拖滚动条 / 键盘 / 触摸）之后重新同步，避免跳回
    window.addEventListener(
      'scroll',
      () => {
        if (Math.abs(window.scrollY - smooth.written) > 2) {
          smooth.target = smooth.current = smooth.written = window.scrollY;
        }
      },
      { passive: true }
    );

    window.addEventListener('resize', () => {
      smooth.target = smooth.current = smooth.written = window.scrollY;
    });
  }

  // 站内锚点：交给惯性滚动处理，保留 URL 锚点
  $$('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = $(id);
    if (!el) return;
    a.addEventListener('click', (e) => {
      if (!smooth.enabled) return;
      e.preventDefault();
      // 给固定顶栏留出空间，避免跳转后小标签被顶栏压住
      const hdrH = hdr ? hdr.offsetHeight : 0;
      const top = window.scrollY + el.getBoundingClientRect().top - hdrH - 14;
      smooth.target = clamp(top, 0, maxScroll());
      smooth.current = window.scrollY;
      kickSmooth();
      history.replaceState(null, '', id);
    });
  });

  /* --- 03 首屏：滚动驱动圆角 KV 放大 -------------------------------------- */
  const hero = $('[data-hero]');
  const heroMedia = hero ? $('.hero__media', hero) : null;
  const coverMedia = $('.proj-hero__img');   // 二级页满屏封面
  const hdr = $('.hdr');

  /* --- 04 视差 ------------------------------------------------------------ */
  const parallaxItems = $$('[data-parallax]').map((el) => ({
    el,
    amp: parseFloat(el.getAttribute('data-parallax')) || 14,
  }));

  /* --- 03b 方案 A：居中方图随滚动放大到铺满 ------------------------------- */
  const heroA = $('[data-hero-a]');
  const heroAMedia = $('[data-hero-media]');
  let heroAZoomMax = 1;

  const measureHeroA = () => {
    if (!heroA || !heroAMedia) return;
    heroAZoomMax = Math.max(
      window.innerWidth / heroAMedia.offsetWidth,
      window.innerHeight / heroAMedia.offsetHeight
    );
  };
  measureHeroA();
  window.addEventListener('resize', measureHeroA);

  /* --- 07 滚动进度条 ------------------------------------------------------ */
  const bar = $('.progress');

  let ticking = false;
  const applyScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;

    // 首屏进度 p：0 = 圆角小图，1 = 满屏
    if (hero) {
      // 0.78：留出约 1/5 的滚动距离让画面在满屏状态下"停一拍"，再交棒给作品区
      const px = Math.max(1, (hero.offsetHeight - vh) * 0.78);
      hero.style.setProperty('--p', clamp(y / px).toFixed(4));
    }

    // 顶栏配色：深色图覆盖到顶栏时反白；亮图则保持深色文字 + 磨砂底
    let light = false;
    if (!reduce.matches) {
      for (const el of [heroMedia, coverMedia]) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 34 && r.bottom >= 104) {
          const toneEl = el.closest('[data-tone]');
          light = !toneEl || toneEl.getAttribute('data-tone') !== 'light';
        }
      }
      // 方案 A：整块首屏都是深色底，顶栏直接反白
      const lightHost = $('[data-light-header]');
      if (lightHost) {
        const r = lightHost.getBoundingClientRect();
        if (r.top <= 34 && r.bottom >= 104) light = true;
      }
    }
    if (hdr) {
      hdr.classList.toggle('is-light', light);
      hdr.classList.toggle('is-solid', !light && y > 12);
    }

    // 作品图轻微视差
    for (const { el, amp } of parallaxItems) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      const half = (vh + r.height) / 2;
      const p = clamp((vh / 2 - r.top + r.height / 2) / (half * 2));
      el.style.transform = `translate3d(0, ${((p - 0.5) * -2 * amp).toFixed(2)}px, 0)`;
    }

    // 进度条
    if (bar) {
      const total = maxScroll();
      bar.style.transform = `scaleX(${total ? clamp(y / total) : 0})`;
    }

    // 方案 A：方图放大
    if (heroA && heroAMedia) {
      const px = Math.max(1, (heroA.offsetHeight - vh) * 0.72);
      const p = clamp(y / px);
      heroAMedia.style.setProperty('--z', (1 + (heroAZoomMax - 1) * p).toFixed(3));
    }

    ticking = false;
  };

  const requestTick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(applyScroll);
  };

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  window.addEventListener('load', requestTick);

  /* --- 09 瀑布流：按最短列分配 -------------------------------------------- */
  const masonry = $('[data-masonry]');
  if (masonry) {
    const cards = Array.from(masonry.children);

    const columnCount = () => {
      const byWidth = window.innerWidth < 720 ? 1 : 2;
      // 作品数量少时不硬凑多列，避免最后一列空掉
      return Math.max(1, Math.min(byWidth, Math.ceil(cards.length / 2)));
    };

    let currentCols = 0;
    const layoutMasonry = () => {
      const n = columnCount();
      const existing = masonry.querySelectorAll('.masonry__col');
      if (n === currentCols && existing.length) return;

      existing.forEach((col) => col.remove());
      masonry.classList.add('masonry--js');

      const cols = [];
      for (let i = 0; i < n; i += 1) {
        const col = document.createElement('div');
        col.className = 'masonry__col';
        masonry.appendChild(col);
        cols.push(col);
      }

      cards.forEach((card) => {
        // 高宽比由 --ar 固定，图片未加载时高度也是稳定的
        const shortest = cols.reduce((a, b) => (a.offsetHeight <= b.offsetHeight ? a : b));
        shortest.appendChild(card);
      });

      currentCols = n;
    };

    layoutMasonry();

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        currentCols = 0;
        layoutMasonry();
        requestTick();
      }, 180);
    });
  }

  /* --- 05 入场揭示 -------------------------------------------------------- */
  const revealTargets = $$('[data-reveal], .mask');
  if (!reduce.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      /* threshold 必须留 0：作品多的二级页，成果展示那一段能长到 7000px 以上，
         按比例设阈值（比如 0.12）永远达不到，整段就会一直停在 opacity:0（看不见）。
         改成「只要顶边进入视口下方 12% 以内就揭示」，多长的段落都能进场。 */
      { threshold: 0, rootMargin: '0px 0px -12% 0px' }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  }

  /* --- 06 自定义光标 ------------------------------------------------------ */
  if (!coarse.matches && !reduce.matches) {
    const cursor = $('#cursor');
    if (cursor) {
      const cursorLabel = $('[data-cursor-label]', cursor);
      let tx = 0, ty = 0, cx = 0, cy = 0;
      let visible = false;

      const loop = () => {
        cx = lerp(cx, tx, 0.16);
        cy = lerp(cy, ty, 0.16);
        // 略微偏移，避免盖住系统指针
        cursor.style.transform = `translate3d(${cx + 18}px, ${cy + 20}px, 0)`;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      window.addEventListener(
        'mousemove',
        (e) => {
          tx = e.clientX;
          ty = e.clientY;
          if (!visible) { cx = tx; cy = ty; visible = true; }
        },
        { passive: true }
      );

      const label = (el) => {
        const text = el.getAttribute('data-cursor');
        if (cursorLabel) cursorLabel.textContent = text || 'View';
        cursor.classList.add('is-on');
      };

      document.addEventListener('mouseover', (e) => {
        const el = e.target.closest?.('[data-cursor]');
        if (el) label(el);
      });

      document.addEventListener('mouseout', (e) => {
        const el = e.target.closest?.('[data-cursor]');
        if (!el) return;
        const to = e.relatedTarget?.closest?.('[data-cursor]');
        if (to !== el) cursor.classList.remove('is-on');
      });
    }
  }

  /* --- 08 年份 ------------------------------------------------------------ */
  $$('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* --- 10 首屏轮播 -------------------------------------------------------- */
  const slideWrap = $('[data-hero-slides]');
  /* 每张封面可能被 <a> 包住（点封面进项目），所以取的是「每一个子项里的 img」 */
  const slideEls = slideWrap ? Array.from(slideWrap.children) : [];
  const slides = slideEls.map((el) => (el.tagName === 'IMG' ? el : el.querySelector('img'))).filter(Boolean);
  const toneHost = slideWrap ? slideWrap.closest('[data-tone]') : null;

  if (hero && slides.length > 1) {
    const dotWrap = $('[data-hero-dots]');
    const dots = dotWrap ? $$('button', dotWrap) : [];
    const counter = $('[data-hero-count]');
    const nameLink = $('[data-hero-name]');
    const INTERVAL = 5600;
    const total = slides.length;
    let idx = 0;
    let timer = 0;

    const show = (i, fromUser) => {
      idx = (i + total) % total;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === idx));
      slideEls.forEach((el, k) => el.classList.toggle('is-active', k === idx));
      const active = slides[idx];
      // 亮图配深色文字，深图配浅色文字（方案 A 的文字在画面外，不需要切换）
      const tone = active.getAttribute('data-tone');
      if (tone && toneHost) toneHost.dataset.tone = tone === 'light' ? 'light' : 'dark';
      // 方案 A：背景辉光取当前图片的平均色
      const glow = active.getAttribute('data-glow');
      if (glow && hero) hero.style.setProperty('--glow', glow);
      dots.forEach((d, k) => d.classList.toggle('is-active', k === idx));
      if (counter) {
        counter.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      }
      // 角落里的作品名跟着当前这张走，并且本身也是那个项目的链接
      const wrap = slideEls[idx];
      if (nameLink && wrap) {
        const href = wrap.getAttribute('href');
        if (href) nameLink.setAttribute('href', href);
        const en = nameLink.querySelector('.i18n-en');
        const zh = nameLink.querySelector('.i18n-zh');
        if (en && wrap.dataset.nameEn) en.textContent = wrap.dataset.nameEn;
        if (zh && wrap.dataset.nameZh) zh.textContent = wrap.dataset.nameZh;
      }
      requestTick(); // 顶栏配色要跟着当前这张图的明暗走
      if (fromUser) restart();
    };

    const restart = () => {
      window.clearInterval(timer);
      if (!reduce.matches) timer = window.setInterval(() => show(idx + 1), INTERVAL);
    };

    dots.forEach((dot, k) => dot.addEventListener('click', () => show(k, true)));

    // 切到别的标签页时停住，回来再继续
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) window.clearInterval(timer);
      else restart();
    });

    restart();
  }

  /* --- 11 方案 B：卡片跟随鼠标 + 轮动放大 --------------------------------- */
  const heroB = $('[data-hero-b]');
  if (heroB) {
    const cards = $$('.heroB__card', heroB);
    let mx = 0, my = 0, tx = 0, ty = 0;

    heroB.addEventListener(
      'mousemove',
      (e) => {
        const r = heroB.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
      },
      { passive: true }
    );
    heroB.addEventListener('mouseleave', () => {
      tx = 0;
      ty = 0;
    });

    if (!reduce.matches && !coarse.matches) {
      const loop = () => {
        mx = lerp(mx, tx, 0.075);
        my = lerp(my, ty, 0.075);
        cards.forEach((card) => {
          const depth = parseFloat(card.getAttribute('data-depth')) || 14;
          card.style.transform = `translate3d(${(-mx * depth).toFixed(2)}px, ${(-my * depth).toFixed(2)}px, 0)`;
        });
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    // 轮动放大：每 3.4 秒换一张抬起
    let up = 0;
    const cycle = () => {
      cards.forEach((card, k) => card.classList.toggle('is-up', k === up));
      up = (up + 1) % cards.length;
    };
    cycle();
    if (!reduce.matches) window.setInterval(cycle, 3400);
  }

  /* --- 12 方案 C：胶囊横向轮播（点击两侧可切换） -------------------------- */
  const heroC = $('[data-hero-c]');
  if (heroC) {
    const track = $('[data-hero-c-track]', heroC);
    const cSlides = track ? $$('.heroC__slide', track) : [];

    if (track && cSlides.length) {
      let i = 0;
      let timer = 0;
      const INTERVAL_C = 3200;

      const place = () => {
        const pill = cSlides[0].offsetWidth;
        const styles = window.getComputedStyle(track);
        const gap = parseFloat(styles.columnGap || styles.gap) || 0;
        const shift = (window.innerWidth - pill) / 2 - i * (pill + gap);
        track.style.transform = `translate3d(${shift.toFixed(1)}px, 0, 0)`;
        cSlides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      };

      const restart = () => {
        window.clearInterval(timer);
        if (!reduce.matches) timer = window.setInterval(() => go(i + 1), INTERVAL_C);
      };

      const go = (n, fromUser) => {
        i = (n + cSlides.length) % cSlides.length;
        place();
        if (fromUser) restart();
      };

      // 点两侧的图直接切过去；当前这张不响应
      cSlides.forEach((slide, k) => {
        slide.addEventListener('click', () => {
          if (k !== i) go(k, true);
        });
      });

      // 胶囊下方的小箭头：上一张 / 下一张（点完重新计时，自动播放照旧）
      const prevBtn = $('[data-hero-prev]', heroC);
      const nextBtn = $('[data-hero-next]', heroC);
      if (prevBtn) prevBtn.addEventListener('click', () => go(i - 1, true));
      if (nextBtn) nextBtn.addEventListener('click', () => go(i + 1, true));

      window.addEventListener('resize', place);
      window.addEventListener('load', place);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) window.clearInterval(timer);
        else restart();
      });

      place();
      restart();
      requestAnimationFrame(place);
    }
  }

  applyScroll();
})();

/* B1TMET · comportamiento común de las páginas (marca.js)
   Barra superior, progreso de lectura, índice con sección activa,
   aparición al desplazarse, tema claro/oscuro, viento animado en la
   portada y botón Copiar en bloques de código. */
(function () {
  'use strict';
  var root = document.documentElement;
  var mq = function (q) { return window.matchMedia ? matchMedia(q) : { matches: false }; };
  var reduce = mq('(prefers-reduced-motion: reduce)').matches;
  var lang = function () { return root.getAttribute('data-lang') || 'en'; };

  /* ---------------- Barra superior y progreso ---------------- */
  var top = document.querySelector('.top');
  var bar = document.querySelector('.progress');
  var hero = document.querySelector('.hero');
  var rails = document.querySelectorAll('.rail');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || root.scrollTop;
    if (top) top.classList.toggle('scrolled', y > 24);
    if (bar) {
      var h = root.scrollHeight - root.clientHeight;
      bar.style.setProperty('--p', h > 0 ? Math.min(1, y / h) : 0);
    }
    if (hero) rails.forEach(function (r) { r.classList.toggle('on', y > hero.offsetHeight * .6); });
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------------- Índice y apariciones ---------------- */
  if ('IntersectionObserver' in window) {
    var links = {};
    document.querySelectorAll('.rail a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = links[e.target.id];
        if (!a) return;
        a.parentNode.parentNode.querySelectorAll('a.act').forEach(function (x) { x.classList.remove('act'); });
        a.classList.add('act');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('.sec[id]').forEach(function (s) { spy.observe(s); });

    /* Índice de la documentación: resalta el apartado visible */
    var tocLinks = {};
    document.querySelectorAll('.toc a[href^="#"]').forEach(function (a) { tocLinks[a.getAttribute('href').slice(1)] = a; });
    var tocSpy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = tocLinks[e.target.id];
        if (!a) return;
        var toc = a.closest('.toc');
        toc.querySelectorAll('a.act').forEach(function (x) { x.classList.remove('act'); });
        a.classList.add('act');
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(tocLinks).forEach(function (id) { var el = document.getElementById(id); if (el) tocSpy.observe(el); });

    if (!reduce) {
      var rv = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });
      document.querySelectorAll('.rv').forEach(function (el) { rv.observe(el); });
    } else {
      document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
    }
  } else {
    document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- Tema claro / oscuro ---------------- */
  var TL = { es: 'Cambiar a modo ', en: 'Switch to ', pt: 'Mudar para o modo ', fr: 'Passer en mode ', it: 'Passa alla modalità ', nl: 'Overschakelen naar ' };
  var TD = { es: ['claro', 'oscuro'], en: ['light mode', 'dark mode'], pt: ['claro', 'escuro'], fr: ['clair', 'sombre'], it: ['chiara', 'scura'], nl: ['lichte modus', 'donkere modus'] };
  var themeBtn = document.querySelector('.theme');
  var sysDark = mq('(prefers-color-scheme: dark)');
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : sysDark.matches;
  }
  function labelTheme() {
    if (!themeBtn) return;
    var l = lang(), d = isDark();
    var txt = (TL[l] || TL.en) + (TD[l] || TD.en)[d ? 0 : 1];
    themeBtn.setAttribute('aria-label', txt);
    themeBtn.title = txt;
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      var apply = function () {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('b1t-theme', next); } catch (e) {}
        labelTheme();
      };
      if (document.startViewTransition && !reduce) document.startViewTransition(apply); else apply();
    });
    if (sysDark.addEventListener) sysDark.addEventListener('change', labelTheme);
    labelTheme();
  }

  /* ---------------- Cambio de idioma ---------------- */
  var sel = document.getElementById('langsel');
  if (sel) sel.addEventListener('change', function () {
    requestAnimationFrame(function () {
      document.querySelectorAll('.rv').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight) el.classList.add('in');
      });
      labelTheme();
      onScroll();
    });
  });

  document.querySelectorAll('.toc-m a').forEach(function (a) {
    a.addEventListener('click', function () { var d = a.closest('details'); if (d) d.open = false; });
  });

  /* ---------------- Viento en la portada ----------------
     Partículas que siguen un campo de viento sintético: alisios del
     este con un vórtice ciclónico (giro antihorario) cerca de los anillos. */
  var cv = document.querySelector('canvas.wind');
  if (cv && hero && !reduce && cv.getContext) {
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, dpr = 1, parts = [], running = false, visible = true, raf = 0;
    var mobile = mq('(max-width: 860px)').matches;
    // Centro del ciclón
    var EX = mobile ? .82 : .74, EY = mobile ? .30 : .44;
    var ptr = { x: 0, y: 0, on: 0, target: 0 };
    function track(e) {
      var r = hero.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.target = 1;
    }
    hero.addEventListener('pointermove', track, { passive: true });
    hero.addEventListener('pointerdown', track, { passive: true });
    hero.addEventListener('pointerleave', function () { ptr.target = 0; });
    hero.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') ptr.target = 0; });
    hero.addEventListener('pointercancel', function () { ptr.target = 0; });
    function field(x, y, t) {
      // Ciclón: vórtice de Rankine con giro antihorario y convergencia hacia el ojo
      var sc = Math.min(W, 1200) / 1200 + .4;
      var cx = W * EX, cy = H * EY;
      var R = Math.min(W, H) * .2 + 30;
      var dx = x - cx, dy = y - cy, r = Math.sqrt(dx * dx + dy * dy) + .001;
      var vt = 3.2 * sc * (r < R ? r / R : Math.pow(R / r, .8));
      var inflow = .35 * vt;
      var u = (dy / r) * vt - (dx / r) * inflow;
      var v = (-dx / r) * vt - (dy / r) * inflow;
      // Alisios del este con ondulación
      u += -1.1 * sc + .35 * Math.sin(y / 70 + t * .0006);
      v += .25 * Math.sin(x / 90 - t * .0005);
      // El cursor o el dedo actúa como un obstáculo: desvía el flujo a su alrededor
      if (ptr.on > .01) {
        var px = x - ptr.x, py = y - ptr.y, pr2 = px * px + py * py, PR = 130;
        if (pr2 < PR * PR * 4) {
          var pr = Math.sqrt(pr2) + .001, k = 4.2 * ptr.on * Math.exp(-pr2 / (PR * PR));
          u += (px / pr) * k + (py / pr) * k * .6;
          v += (py / pr) * k - (px / pr) * k * .6;
        }
      }
      return [u, v];
    }
    function spawn(p, anywhere) {
      p.x = anywhere ? Math.random() * W : W + Math.random() * 40;
      p.y = Math.random() * H;
      p.age = 0;
      p.life = 80 + Math.random() * 160;
      p.s = .85 + Math.random() * .3;
      p.c = Math.random() < .7 ? 'rgba(162,178,244,' : 'rgba(56,91,214,';
      return p;
    }
    function resize() {
      var r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(mobile ? 160 : 500, W * H / (mobile ? 2200 : 1600)));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(spawn({}, true));
    }
    function frame(t) {
      raf = 0;
      if (!running) return;
      ptr.on += (ptr.target - ptr.on) * .08;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,.075)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], f = field(p.x, p.y, t);
        var nx = p.x + f[0] * p.s, ny = p.y + f[1] * p.s;
        var a = Math.sin(Math.PI * p.age / p.life) * .42;
        ctx.strokeStyle = p.c + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.age++;
        if (p.age > p.life || p.x < -20 || p.y < -20 || p.y > H + 20 || p.x > W + 60) spawn(p, Math.random() < .7);
      }
      raf = requestAnimationFrame(frame);
    }
    function play() {
      var go = visible && !document.hidden;
      if (go && !running) { running = true; if (!raf) raf = requestAnimationFrame(frame); }
      if (!go) running = false;
    }
    resize();
    var rto;
    window.addEventListener('resize', function () { clearTimeout(rto); rto = setTimeout(resize, 200); });
    document.addEventListener('visibilitychange', play);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; play(); }).observe(hero);
    }
    play();
  }

  /* ---------------- Botón Copiar en bloques de código ---------------- */
  var L = { es: ['Copiar', 'Copiado'], en: ['Copy', 'Copied'], pt: ['Copiar', 'Copiado'], fr: ['Copier', 'Copié'], it: ['Copia', 'Copiato'], nl: ['Kopiëren', 'Gekopieerd'] };
  function t(i) { return (L[lang()] || L.en)[i]; }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, ko) {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? ok() : ko(); } catch (e) { ko(e); }
      document.body.removeChild(ta);
    });
  }
  document.querySelectorAll('pre.code').forEach(function (pre) {
    if (pre.querySelector('.copy')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = t(0);
    b.addEventListener('click', function () {
      var c = pre.querySelector('code') || pre;
      copy(c.textContent).then(function () {
        b.textContent = t(1); b.classList.add('done');
        setTimeout(function () { b.textContent = t(0); b.classList.remove('done'); }, 1600);
      }, function () {});
    });
    pre.appendChild(b);
  });
})();

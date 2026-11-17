/* =========================================================
   Jay's Junk Removal: interactions & animation
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  if (!hasGSAP) { root.classList.remove('js'); root.classList.add('no-js'); }
  if (reduced) root.classList.add('reduced');
  $$('.year').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Smooth scroll ---------- */
  var lenis = null;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  if (hasGSAP && !reduced && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToTarget(target, offset) {
    if (lenis) lenis.scrollTo(target, { duration: 1.3, offset: offset || 0 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + (offset || 0), behavior: reduced ? 'auto' : 'smooth' });
  }

  /* ---------- Header, progress, mobile bar ---------- */
  var nav = $('.nav'), progress = $('.progress span'), mbar = $('.mbar'), hero = $('.hero');
  var lastY = window.scrollY, menuOpen = false, bookVisible = false;
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('is-solid', y > 40);
    if (!menuOpen) {
      if (y > 500 && y > lastY + 2) nav.classList.add('is-hidden');
      else if (y < lastY - 2 || y <= 500) nav.classList.remove('is-hidden');
    }
    lastY = y;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (mbar) mbar.classList.toggle('is-on', y > hero.offsetHeight * 0.55 && !bookVisible && !menuOpen);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  if ('IntersectionObserver' in window) {
    var navLinks = $$('.nav__links a');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) io.observe(s); });
    new IntersectionObserver(function (en) { bookVisible = en[0].isIntersecting; onScroll(); }, { rootMargin: '0px 0px -10% 0px' }).observe($('#book'));
  }

  /* ---------- Mobile menu ---------- */
  var burger = $('.burger'), menu = $('#mobile-menu');
  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.remove('is-hidden');
    onScroll();
    if (open) {
      menu.hidden = false;
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
      if (hasGSAP && !reduced) {
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'power4.inOut' });
        gsap.fromTo($$('nav a, .mmenu__foot > *', menu), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.05, duration: 0.6, delay: 0.25, ease: 'power3.out' });
      }
      var first = $('nav a', menu); if (first) first.focus({ preventScroll: true });
    } else {
      document.body.style.overflow = '';
      if (lenis) lenis.start();
      var done = function () { menu.hidden = true; };
      if (hasGSAP && !reduced) gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.5, ease: 'power4.inOut', onComplete: done });
      else done();
    }
  }
  burger.addEventListener('click', function () { setMenu(!menuOpen); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 1023 && menuOpen) setMenu(false); });

  /* ---------- Anchor links ---------- */
  function goTo(id, focusEl) {
    var target = $(id);
    if (!target) return;
    var wasOpen = menuOpen;
    setMenu(false);
    setTimeout(function () {
      scrollToTarget(id === '#home' ? 0 : target, id === '#book' ? -20 : 0);
      if (id !== '#home') {
        var f = focusEl || target;
        if (!focusEl && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        setTimeout(function () { f.focus({ preventScroll: true }); }, focusEl ? 900 : 0);
      }
    }, wasOpen ? 350 : 0);
    if (history.replaceState) history.replaceState(null, '', id);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2 || !$(id)) return;
      e.preventDefault();
      var svc = a.getAttribute('data-service');
      if (svc) { var sel = $('#f-service'); sel.value = svc; sel.dispatchEvent(new Event('change')); }
      goTo(id);
    });
  });

  /* ---------- Accordion ---------- */
  var accItems = $$('.acc__item');
  function setAcc(item, open) {
    var btn = $('.acc__btn', item), panel = $('.acc__panel', item);
    btn.setAttribute('aria-expanded', String(open));
    item.classList.toggle('is-open', open);
    if (hasGSAP && !reduced) gsap.to(panel, { height: open ? 'auto' : 0, duration: 0.55, ease: 'power3.inOut' });
    else panel.style.height = open ? 'auto' : '0px';
  }
  accItems.forEach(function (item, i) {
    $('.acc__btn', item).addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      accItems.forEach(function (o) { if (o !== item && o.classList.contains('is-open')) setAcc(o, false); });
      setAcc(item, open);
    });
    if (i === 0) { item.classList.add('is-open'); $('.acc__btn', item).setAttribute('aria-expanded', 'true'); $('.acc__panel', item).style.height = 'auto'; }
  });

  /* =========================================================
     "What's going?" pile builder
     ========================================================= */
  (function pileBuilder() {
    var chips = $$('.chip'), stack = $('.pile__stack'), empty = $('.pile__empty'), count = $('.pile__count');
    var send = $('.pile__send'), clear = $('.pile__clear');
    if (!chips.length) return;
    function picked() { return chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; }); }
    function refresh() {
      var n = picked().length;
      count.textContent = n + (n === 1 ? ' item' : ' items');
      empty.hidden = n > 0;
      send.disabled = n === 0;
    }
    function addTag(chip) {
      var t = document.createElement('span');
      t.className = 'pile__tag'; t.textContent = chip.getAttribute('data-item');
      t.dataset.key = chip.getAttribute('data-item');
      stack.appendChild(t);
      if (hasGSAP && !reduced) gsap.fromTo(t, { y: -260, rotate: rand(-25, 25), autoAlpha: 0 }, { y: 0, rotate: rand(-4, 4), autoAlpha: 1, duration: 0.9, ease: 'bounce.out' });
    }
    function removeTag(chip) {
      var key = chip.getAttribute('data-item');
      $$('.pile__tag', stack).forEach(function (t) {
        if (t.dataset.key !== key) return;
        if (hasGSAP && !reduced) gsap.to(t, { y: -120, x: rand(-60, 60), rotate: rand(-40, 40), autoAlpha: 0, duration: 0.5, ease: 'power2.in', onComplete: function () { t.remove(); } });
        else t.remove();
      });
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var on = chip.getAttribute('aria-pressed') !== 'true';
        chip.setAttribute('aria-pressed', String(on));
        if (on) addTag(chip); else removeTag(chip);
        refresh();
      });
    });
    clear.addEventListener('click', function () {
      picked().forEach(function (c) { c.setAttribute('aria-pressed', 'false'); removeTag(c); });
      refresh();
    });
    send.addEventListener('click', function () {
      var items = picked();
      if (!items.length) return;
      var names = items.map(function (c) { return c.getAttribute('data-item'); });
      var svcs = items.map(function (c) { return c.getAttribute('data-svc'); }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      var details = $('#f-details'), sel = $('#f-service');
      var line = 'Items to remove: ' + names.join(', ');
      var rest = details.value.split('\n').filter(function (l) { return l.indexOf('Items to remove:') !== 0; }).join('\n').trim();
      details.value = line + (rest ? '\n' + rest : '');
      details.dispatchEvent(new Event('input'));
      if (!sel.value) {
        sel.value = svcs.length === 1 ? svcs[0] : (svcs.indexOf('Property Cleanout') > -1 ? 'Property Cleanout' : 'Junk Removal');
        sel.dispatchEvent(new Event('change'));
      }
      goTo('#book', $('#f-name'));
      if (hasGSAP && !reduced) setTimeout(function () { gsap.fromTo(details, { boxShadow: '0 0 0 0 rgba(198,244,50,.9)' }, { boxShadow: '0 0 0 10px rgba(198,244,50,0)', duration: 1.4, repeat: 1, ease: 'power2.out', clearProps: 'boxShadow' }); }, 1100);
    });
    refresh();
  })();

  /* =========================================================
     Appointment form (Netlify Forms, AJAX)
     ========================================================= */
  (function form() {
    var f = $('.bform');
    if (!f) return;
    var success = $('.bsuccess'), errBox = $('.bform__error'), date = $('#f-date');
    function today() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
    date.min = today();
    var rules = {
      'f-name': function (v) { return v.trim().length > 1 || 'Please enter your full name.'; },
      'f-phone': function (v) { return v.replace(/\D/g, '').length >= 10 || 'Please enter a phone number with at least 10 digits.'; },
      'f-email': function (v) { return !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Please enter a valid email address, or leave it blank.'; },
      'f-service': function (v) { return !!v || 'Please choose the service you need.'; },
      'f-date': function (v) { if (!v) return 'Please choose a preferred date.'; return v >= today() || 'Please choose today or a future date.'; },
      'f-time': function (v) { return !!v || 'Please choose a preferred time.'; },
      'f-address': function (v) { return v.trim().length > 4 || 'Please enter the service address.'; }
    };
    function check(id) {
      var el = document.getElementById(id), res = rules[id](el.value), err = document.getElementById(id + '-err'), ok = res === true;
      el.closest('.field').classList.toggle('is-invalid', !ok);
      el.setAttribute('aria-invalid', String(!ok));
      if (err) { err.textContent = ok ? '' : res; if (ok) el.removeAttribute('aria-describedby'); else el.setAttribute('aria-describedby', id + '-err'); }
      return ok;
    }
    Object.keys(rules).forEach(function (id) {
      var el = document.getElementById(id), fld = el.closest('.field');
      el.addEventListener('blur', function () { if (el.value) check(id); });
      ['input', 'change'].forEach(function (ev) { el.addEventListener(ev, function () { if (fld.classList.contains('is-invalid')) check(id); }); });
    });
    function showError(msg) {
      errBox.innerHTML = msg + ' You can also call <a href="tel:+15717070586">(571) 707-0586</a>.';
      errBox.hidden = false;
      if (hasGSAP && !reduced) gsap.fromTo(errBox, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4 });
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      errBox.hidden = true;
      var bad = null;
      Object.keys(rules).forEach(function (id) { if (!check(id) && !bad) bad = document.getElementById(id); });
      if (bad) { bad.focus(); showError('Please fix the highlighted fields.'); return; }
      f.classList.add('is-sending');
      var label = $('.bform__label', f), orig = label.textContent;
      label.textContent = 'Sending your request…';
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(f)).toString()
      }).then(function (r) {
        if (!r.ok) throw new Error('Status ' + r.status);
        f.hidden = true; success.hidden = false; success.focus();
        if (hasGSAP && !reduced) {
          gsap.from(success.children, { y: 30, autoAlpha: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out' });
          gsap.from($('.bsuccess__ico', success), { scale: 0, rotate: -90, duration: 0.9, ease: 'back.out(2)' });
        }
      }).catch(function () {
        showError('Sorry, your request could not be sent. Please try again in a moment.');
      }).then(function () {
        f.classList.remove('is-sending'); label.textContent = orig;
      });
    });
    $('.bsuccess__again').addEventListener('click', function () {
      f.reset(); success.hidden = true; f.hidden = false; errBox.hidden = true;
      $$('.field', f).forEach(function (x) { x.classList.remove('is-invalid'); });
      $('#f-name').focus();
    });
  })();

  /* =========================================================
     Pointer effects (desktop)
     ========================================================= */
  if (finePointer && !reduced && hasGSAP) {
    root.classList.add('has-cursor');
    var cursor = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
    var dx = gsap.quickTo(dot, 'x', { duration: 0.06 }), dy = gsap.quickTo(dot, 'y', { duration: 0.06 });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.4, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.4, ease: 'power3' });
    window.addEventListener('pointermove', function (e) {
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      var t = e.target;
      cursor.classList.toggle('is-hover', !!t.closest('a, button, .card'));
      cursor.classList.toggle('is-hidden', !!t.closest('input, textarea, select'));
    });
    document.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
    document.addEventListener('mouseenter', function () { cursor.classList.remove('is-hidden'); });

    $$('.magnetic').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.25); my((e.clientY - r.top - r.height / 2) * 0.3); });
      el.addEventListener('pointerleave', function () { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, .4)' }); });
    });

    var heroImg = $('.hero__media img');
    hero.addEventListener('pointermove', function (e) {
      var px = e.clientX / window.innerWidth - 0.5, py = e.clientY / window.innerHeight - 0.5;
      gsap.to(heroImg, { x: px * -24, y: py * -16, duration: 1.2, ease: 'power3.out' });
    });
  }

  /* =========================================================
     GSAP choreography
     ========================================================= */
  if (!hasGSAP) return;

  $$('.split').forEach(function (h) {
    var label = h.textContent.replace(/\s+/g, ' ').trim();
    h.innerHTML = label.split(' ').map(function (w) { return '<span class="w" aria-hidden="true"><span>' + w + '</span></span>'; }).join(' ');
    h.setAttribute('aria-label', label);
  });

  if (reduced) { var ld = $('.loader'); if (ld) ld.remove(); return; }

  /* ---------- Preloader: roll-up door ---------- */
  var loader = $('.loader'), chars = $$('.hline--1 .ch');
  root.style.overflow = 'hidden';
  if (lenis) lenis.stop();
  gsap.set(chars, { yPercent: 120, rotate: function () { return rand(-14, 14); }, autoAlpha: 0 });
  gsap.set('.gone__bar', { scaleX: 0 });
  gsap.set('.gone__txt', { yPercent: 110, autoAlpha: 0 });
  gsap.set(['.hero__tag', '.hero__lead', '.hero__actions > *', '.nav__inner'], { autoAlpha: 0, y: 26 });
  gsap.set('.hero__media img', { scale: 1.3 });
  var count = { v: 0 }, num = $('.loader__count span'), finished = false;
  function release() {
    if (finished) return; finished = true;
    root.style.overflow = ''; if (lenis) lenis.start();
    if (loader) loader.remove();
    ScrollTrigger.refresh();
  }
  var tl = gsap.timeline({ onComplete: release });
  tl.from('.loader__mark > *, .loader__count', { y: 24, autoAlpha: 0, stagger: 0.08, duration: 0.5, ease: 'power3.out' })
    .to(count, { v: 100, duration: 1.2, ease: 'power2.inOut', onUpdate: function () { num.textContent = Math.round(count.v); } }, 0.1)
    .to('.loader__door', { y: 14, duration: 0.18, ease: 'power2.in' }, '+=0.1')
    .addLabel('open')
    .to('.loader__door', { yPercent: -100, y: 0, duration: 1.05, ease: 'power4.inOut' }, 'open')
    .to('.hero__media img', { scale: 1, duration: 2.2, ease: 'expo.out' }, 'open+=0.3')
    .to(chars, { yPercent: 0, rotate: 0, autoAlpha: 1, stagger: 0.045, duration: 0.9, ease: 'back.out(2.2)' }, 'open+=0.55')
    .to('.gone__bar', { scaleX: 1, duration: 0.6, ease: 'power4.inOut' }, 'open+=1.05')
    .to('.gone__txt', { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out' }, 'open+=1.35')
    .to(['.hero__tag', '.hero__lead', '.hero__actions > *', '.nav__inner'], { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.9, ease: 'power3.out' }, 'open+=1.2')
    .add(release, 'open+=1.1');
  setTimeout(function () { if (!finished) { tl.progress(1); release(); } }, 7000);

  /* ---------- Hero: "your junk." gets hauled away on scroll ---------- */
  var haul = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: 0.8 } });
  chars.forEach(function (c, i) {
    haul.to(c, { y: function () { return -rand(180, 480); }, x: function () { return rand(-140, 220); }, rotate: function () { return rand(-70, 70); }, autoAlpha: 0, ease: 'power2.in', duration: 1 }, i * 0.04);
  });
  haul.to('.hero__media', { yPercent: 16, ease: 'none', duration: 1.4 }, 0)
    .to('.hline--2, .hero__bottom, .hero__tag', { y: -60, autoAlpha: 0.25, ease: 'none', duration: 1.2 }, 0.2);

  /* ---------- Marquees with scroll velocity ---------- */
  var loops = [];
  function loopRow(el, dur) { var tw = gsap.fromTo(el, { xPercent: 0 }, { xPercent: -50, duration: dur, ease: 'none', repeat: -1 }); tw.totalTime(tw.duration() * 100); return tw; }
  if ($('.marquee__track')) loops.push(loopRow($('.marquee__track'), 26));
  if ($('.final__track')) loops.push(loopRow($('.final__track'), 22));
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (self) {
      var v = self.getVelocity(), dir = self.direction;
      loops.forEach(function (tw) {
        gsap.to(tw, { timeScale: dir * (1 + Math.min(Math.abs(v) / 280, 5)), duration: 0.2, overwrite: true, onComplete: function () { gsap.to(tw, { timeScale: dir, duration: 1.2 }); } });
      });
    }
  });

  /* ---------- Headings & small text ---------- */
  $$('.split').forEach(function (h) {
    gsap.from($$('.w > span', h), { yPercent: 110, stagger: 0.05, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
  });
  $$('.eyebrow, .shead__lead, .load__lead, .book__lead').forEach(function (el) {
    gsap.from(el, { y: 20, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });
  $$('.eyebrow__line').forEach(function (el) {
    gsap.from(el, { scaleX: 0, transformOrigin: 'left', duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });

  /* ---------- Services ---------- */
  ScrollTrigger.batch('.card', {
    start: 'top 90%', once: true,
    onEnter: function (els) {
      gsap.fromTo(els, { y: 90, autoAlpha: 0, clipPath: 'inset(18% 0 0 0 round 18px)' }, { y: 0, autoAlpha: 1, clipPath: 'inset(0% 0 0 0 round 18px)', stagger: 0.08, duration: 1.1, ease: 'expo.out', clearProps: 'transform,opacity,visibility,clipPath' });
    }
  });
  gsap.set('.card', { autoAlpha: 0 });

  /* ---------- Pile builder ---------- */
  gsap.from('.chip', { y: 24, autoAlpha: 0, stagger: 0.035, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: '.chips', start: 'top 88%' } });
  gsap.from('.pile', { y: 70, rotate: 2, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.pile', start: 'top 90%' } });

  /* ---------- Why ---------- */
  gsap.from('.why__img', { clipPath: 'inset(0 100% 0 0 round 26px)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: '.why__media', start: 'top 78%' } });
  gsap.fromTo('.why__img img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.why', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.why__badge', { scale: 0, rotate: -120, duration: 1.1, delay: 0.6, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.why__media', start: 'top 78%' } });
  gsap.from('.reason', { x: 40, autoAlpha: 0, stagger: 0.09, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.reasons', start: 'top 85%' } });

  /* ---------- How it works ---------- */
  var mmS = gsap.matchMedia();
  mmS.add({ small: '(max-width: 1023px)', large: '(min-width: 1024px)' }, function (c) {
    var small = c.conditions.small;
    var base = { trigger: '.steps', start: small ? 'top 75%' : 'top 72%', end: small ? 'bottom 55%' : 'top 30%', scrub: true };
    var withSteps = Object.assign({}, base, { onUpdate: function (self) { $$('.step').forEach(function (s, i) { s.classList.toggle('is-on', self.progress >= i / 3 + 0.02); }); } });
    gsap.fromTo('.steps__fill', small ? { scaleY: 0, scaleX: 1 } : { scaleX: 0 }, small ? { scaleY: 1, ease: 'none', scrollTrigger: withSteps } : { scaleX: 1, ease: 'none', scrollTrigger: withSteps });
    gsap.fromTo('.steps__truck', small ? { top: '0%' } : { left: '0%' }, small ? { top: '100%', ease: 'none', scrollTrigger: Object.assign({}, base) } : { left: '100%', ease: 'none', scrollTrigger: Object.assign({}, base) });
  });
  gsap.from('.step', { y: 60, autoAlpha: 0, stagger: 0.14, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.steps', start: 'top 85%' }, clearProps: 'transform' });
  gsap.from('.how__band', { clipPath: 'inset(30% 8% 30% 8% round 26px)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.how__band', start: 'top 85%' } });
  gsap.fromTo('.how__band img', { yPercent: -18 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.how__band', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- Booking ---------- */
  gsap.from('.notice, .book__points li', { y: 24, autoAlpha: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.notice', start: 'top 90%' } });
  gsap.from('.formcard', { y: 80, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.formcard', start: 'top 92%' } });

  /* ---------- Service area ---------- */
  gsap.from('.area__l', { xPercent: -12, autoAlpha: 0, stagger: 0.12, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.area__title', start: 'top 85%' } });
  gsap.from('.area__text, .area__actions', { y: 30, autoAlpha: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.area__text', start: 'top 92%' } });
  gsap.from('.radar', { scale: 0.6, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.radar', start: 'top 85%' } });
  gsap.fromTo('.area__bg img', { yPercent: -10 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.area', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- FAQ ---------- */
  gsap.from('.acc__item', { y: 30, autoAlpha: 0, stagger: 0.07, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.acc', start: 'top 86%' } });

  /* ---------- Final CTA ---------- */
  gsap.fromTo('.final__media img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.from('.fl > span', { yPercent: 110, stagger: 0.1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.final__title', start: 'top 80%' } });
  gsap.from('.final__actions > *', { y: 30, autoAlpha: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.final__actions', start: 'top 92%' } });

  /* ---------- Footer ---------- */
  gsap.from('.foot__word', { yPercent: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.foot__word', start: 'top 98%' } });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
